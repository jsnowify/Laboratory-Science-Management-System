import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { can, type Permission } from "@lsms/shared";
import { auth } from "./auth";
import { database } from "../db";
import { users } from "../db/introspected/schema";
import { AppError } from "../lib/errors";

export async function requireProfile(request: FastifyRequest) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session) throw new AppError(401, "UNAUTHORIZED", "Sign in to continue.");
  const [profile] = await database()
    .select()
    .from(users)
    .where(eq(users.authUserId, session.user.id))
    .limit(1);
  if (!profile)
    throw new AppError(
      403,
      "PROFILE_MISSING",
      "This account is not linked to an LSMS profile.",
    );
  return profile;
}

export async function requireActiveProfile(request: FastifyRequest) {
  const profile = await requireProfile(request);
  if (profile.accountStatus !== "active")
    throw new AppError(
      403,
      "ACCOUNT_INACTIVE",
      "This account is awaiting activation or is unavailable.",
    );
  return profile;
}

export async function requirePermission(
  request: FastifyRequest,
  permission: Permission,
) {
  const profile = await requireActiveProfile(request);
  if (!can(profile.role, permission))
    throw new AppError(
      403,
      "FORBIDDEN",
      "You do not have permission for this action.",
    );
  return profile;
}
