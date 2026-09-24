import type { FastifyInstance } from "fastify";
import { listQuery, uuidParam } from "@lsms/shared";
import { requirePermission } from "../../auth/authorize";
import {
  createRequisition,
  generateRequisitionPdf,
  listRequisitions,
  markRequisitionReleased,
} from "./requisition.service";

export async function requisitionRoutes(app: FastifyInstance) {
  app.get("/api/v1/iso/", async (request) => {
    await requirePermission(request, "iso.generate");
    const { page, limit } = listQuery.parse(request.query);
    return listRequisitions(page, limit);
  });
  app.post("/api/v1/borrow-requests/:id/iso/", async (request, reply) => {
    const actor = await requirePermission(request, "iso.generate");
    return reply
      .code(201)
      .send(
        await createRequisition(uuidParam.parse(request.params).id, actor.id),
      );
  });
  app.get("/api/v1/iso/:id/pdf/", async (request, reply) => {
    const actor = await requirePermission(request, "iso.generate");
    const id = uuidParam.parse(request.params).id;
    const bytes = await generateRequisitionPdf(id, actor.id);
    const query = request.query as { download?: string };
    reply.header(
      "Content-Disposition",
      `${query.download === "true" ? "attachment" : "inline"}; filename="lsms-requisition-${id}.pdf"`,
    );
    return reply.type("application/pdf").send(Buffer.from(bytes));
  });
  app.post("/api/v1/iso/:id/release/", async (request) => {
    const actor = await requirePermission(request, "iso.generate");
    return markRequisitionReleased(
      uuidParam.parse(request.params).id,
      actor.id,
    );
  });
}
