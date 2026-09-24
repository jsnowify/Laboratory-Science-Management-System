import type { FastifyInstance } from "fastify";
import { registrationInput, setupInput, staffInput } from "@lsms/shared";
import { requirePermission } from "../../auth/authorize";
import { requireProfile } from "../../auth/authorize";
import {
  createAdmin,
  createFirstSuperAdmin,
  registerStudentFaculty,
  setupAvailable,
} from "./identity.service";

export async function identityRoutes(app: FastifyInstance) {
  app.get("/api/v1/setup/status/", async () => ({
    available: await setupAvailable(),
  }));

  app.post(
    "/api/v1/setup/",
    { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const input = setupInput.parse(request.body);
      const result = await createFirstSuperAdmin(input);
      return reply.code(201).send(result);
    },
  );

  app.post(
    "/api/v1/registration/",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const input = registrationInput.parse(request.body);
      const result = await registerStudentFaculty(input);
      return reply.code(201).send(result);
    },
  );

  app.get("/api/v1/me/", async (request) => {
    const profile = await requireProfile(request);
    return {
      id: profile.id,
      institutionalId: profile.institutionalId,
      role: profile.role,
      personType: profile.personType,
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      email: profile.email,
      accountStatus: profile.accountStatus,
    };
  });

  app.post("/api/v1/staff/", async (request, reply) => {
    const actor = await requirePermission(request, "users.create_admin");
    return reply
      .code(201)
      .send(await createAdmin(staffInput.parse(request.body), actor.id));
  });
}
