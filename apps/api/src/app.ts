import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import { strongPassword } from "@lsms/shared";
import { auth } from "./auth/auth";
import { database } from "./db";
import { auditLogs, users } from "./db/introspected/schema";
import { serverEnv } from "./lib/env";
import { trustedMutationOrigin } from "./lib/request-origin";
import { AppError, applicationError } from "./lib/errors";
import { ZodError } from "zod";
import { identityRoutes } from "./modules/users/identity.routes";
import { organizationRoutes } from "./modules/organization/organization.routes";
import { accountsRoutes } from "./modules/users/accounts.routes";
import { equipmentRoutes } from "./modules/equipment/equipment.routes";
import { borrowingRoutes } from "./modules/borrowing/borrowing.routes";
import { requisitionRoutes } from "./modules/iso/requisition.routes";
import { notificationRoutes } from "./modules/notifications/notifications.routes";
import { analyticsRoutes } from "./modules/analytics/analytics.routes";
import { dashboardRoutes } from "./modules/analytics/dashboard.routes";
import { auditRoutes } from "./modules/analytics/audit.routes";

export async function createApp() {
  const env = serverEnv();
  const app = Fastify({
    logger: true,
    bodyLimit: 128 * 1024,
    routerOptions: { ignoreTrailingSlash: false },
  });
  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(helmet);
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/api/")) return;
    reply.header("Cache-Control", "no-store");
    if (
      !request.url.startsWith("/api/v1/") ||
      !["POST", "PATCH", "PUT", "DELETE"].includes(request.method)
    )
      return;
    if (!trustedMutationOrigin(request.headers, env.FRONTEND_URL)) {
      throw new AppError(
        403,
        "UNTRUSTED_ORIGIN",
        "This action must be started from the LSMS website.",
      );
    }
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if (error instanceof ZodError) {
      return reply
        .code(422)
        .send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the submitted fields.",
            fields: error.flatten().fieldErrors,
          },
        });
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      error.statusCode === 429
    ) {
      return reply
        .code(429)
        .send({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Try again later.",
          },
        });
    }
    const appError = applicationError(error);
    reply
      .code(appError.statusCode)
      .send({ error: { code: appError.code, message: appError.message } });
  });

  app.get("/health/", async () => {
    await database().execute("select 1");
    return { status: "ok" };
  });

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: async (request, reply) => {
      if (
        request.method === "POST" &&
        request.url.startsWith("/api/auth/sign-up/email")
      ) {
        throw new AppError(
          403,
          "USE_REGISTRATION",
          "Use the LSMS registration form.",
        );
      }
      if (
        request.method === "POST" &&
        (request.url.startsWith("/api/auth/update-user") ||
          request.url.startsWith("/api/auth/change-email"))
      ) {
        throw new AppError(
          403,
          "USE_PROFILE",
          "Use the LSMS profile form to update account details.",
        );
      }
      if (
        request.method === "POST" &&
        request.url.startsWith("/api/auth/change-password")
      ) {
        strongPassword.parse(
          (request.body as { newPassword?: unknown } | undefined)?.newPassword,
        );
      }
      const passwordChange =
        request.method === "POST" &&
        request.url.startsWith("/api/auth/change-password");
      const passwordSession = passwordChange
        ? await auth.api.getSession({
            headers: fromNodeHeaders(request.headers),
          })
        : null;
      const url = new URL(request.url, env.BETTER_AUTH_URL);
      const headers = fromNodeHeaders(request.headers);
      const response = await auth.handler(
        new Request(url, {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        }),
      );
      if (passwordChange && response.ok && passwordSession) {
        try {
          const [actor] = await database()
            .select({ id: users.id })
            .from(users)
            .where(eq(users.authUserId, passwordSession.user.id))
            .limit(1);
          if (actor)
            await database()
              .insert(auditLogs)
              .values({
                actorUserId: actor.id,
                action: "profile.password_changed",
                entityType: "users",
                entityId: actor.id,
              });
        } catch (error) {
          request.log.error(
            { error },
            "Password changed but audit insert failed",
          );
        }
      }
      reply.code(response.status);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header("set-cookie", cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });

  await app.register(identityRoutes);
  await app.register(organizationRoutes);
  await app.register(accountsRoutes);
  await app.register(equipmentRoutes);
  await app.register(borrowingRoutes);
  await app.register(requisitionRoutes);
  await app.register(notificationRoutes);
  await app.register(analyticsRoutes);
  await app.register(dashboardRoutes);
  await app.register(auditRoutes);

  return app;
}
