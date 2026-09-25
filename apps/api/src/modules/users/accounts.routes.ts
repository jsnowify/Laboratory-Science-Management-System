import type { FastifyInstance } from "fastify";
import { can, profileUpdateInput, userListQuery, userStatusInput, uuidParam } from "@lsms/shared";
import { requireActiveProfile, requirePermission } from "../../auth/authorize";
import { AppError } from "../../lib/errors";
import { changeUserStatus, listManageableUsers, updateAccountDetails } from "./accounts.service";

export async function accountsRoutes(app: FastifyInstance) {
  app.get("/api/v1/users/", async (request) => {
    const actor = await requireActiveProfile(request);
    if (!can(actor.role, "users.manage") && !can(actor.role, "users.manage_all")) throw new AppError(403, "FORBIDDEN", "You cannot view user accounts.");
    return listManageableUsers(userListQuery.parse(request.query), actor.role);
  });
  app.post("/api/v1/users/:id/status/", async (request) => {
    const actor = await requireActiveProfile(request);
    if (!can(actor.role, "users.manage") && !can(actor.role, "users.manage_all")) throw new AppError(403, "FORBIDDEN", "You cannot manage account statuses.");
    return changeUserStatus(
      uuidParam.parse(request.params).id,
      userStatusInput.parse(request.body),
      actor.id,
      actor.role,
    );
  });
  app.patch("/api/v1/users/:id/", async (request) => {
    const actor = await requirePermission(request, "users.manage_all");
    return updateAccountDetails(uuidParam.parse(request.params).id, profileUpdateInput.parse(request.body), actor.id, actor.role);
  });
}
