import type { FastifyInstance } from "fastify";
import { userListQuery, userStatusInput, uuidParam } from "@lsms/shared";
import { requirePermission } from "../../auth/authorize";
import { changeUserStatus, listManageableUsers } from "./accounts.service";

export async function accountsRoutes(app: FastifyInstance) {
  app.get("/api/v1/users/", async (request) => {
    await requirePermission(request, "users.manage");
    return listManageableUsers(userListQuery.parse(request.query));
  });
  app.post("/api/v1/users/:id/status/", async (request) => {
    const actor = await requirePermission(request, "users.manage");
    return changeUserStatus(
      uuidParam.parse(request.params).id,
      userStatusInput.parse(request.body),
      actor.id,
    );
  });
}
