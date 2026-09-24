import type { FastifyInstance } from "fastify";
import { allocationInput, approvalInput, borrowListQuery, borrowRequestInput, listQuery, rejectionInput, releaseInput, returnInput, reviewInput, uuidParam } from "@lsms/shared";
import { requireActiveProfile, requirePermission } from "../../auth/authorize";
import { AppError } from "../../lib/errors";
import { allocateAsset, listAccountability, listCustody, listOverdue, processReturn, releaseRequest } from "./custody.service";
import { approveRequest, cancelRequest, createDraft, getRequest, listRequests, rejectRequest, startReview, submitRequest, updateDraft } from "./requests.service";

export async function borrowingRoutes(app: FastifyInstance) {
  app.get("/api/v1/borrow-requests/", async (request) => {
    const actor = await requireActiveProfile(request);
    return listRequests(borrowListQuery.parse(request.query), actor);
  });
  app.post("/api/v1/borrow-requests/", async (request, reply) => {
    const actor = await requirePermission(request, "borrow_request.create");
    return reply.code(201).send(await createDraft(borrowRequestInput.parse(request.body), actor.id));
  });
  app.get("/api/v1/borrow-requests/:id/", async (request) => {
    const actor = await requireActiveProfile(request);
    return getRequest(uuidParam.parse(request.params).id, actor);
  });
  app.patch("/api/v1/borrow-requests/:id/", async (request) => {
    const actor = await requirePermission(request, "borrow_request.create");
    return updateDraft(uuidParam.parse(request.params).id, borrowRequestInput.parse(request.body), actor.id);
  });
  app.post("/api/v1/borrow-requests/:id/submit/", async (request) => {
    const actor = await requirePermission(request, "borrow_request.create");
    return submitRequest(uuidParam.parse(request.params).id, actor.id);
  });
  app.post("/api/v1/borrow-requests/:id/cancel/", async (request) => {
    const actor = await requirePermission(request, "borrow_request.cancel_own");
    return cancelRequest(uuidParam.parse(request.params).id, actor.id);
  });
  app.post("/api/v1/borrow-requests/:id/review/", async (request) => {
    const actor = await requirePermission(request, "borrowing.review");
    return startReview(uuidParam.parse(request.params).id, actor.id, reviewInput.parse(request.body ?? {}));
  });
  app.post("/api/v1/borrow-requests/:id/approve/", async (request) => {
    const actor = await requirePermission(request, "borrowing.approve");
    return approveRequest(uuidParam.parse(request.params).id, actor.id, approvalInput.parse(request.body));
  });
  app.post("/api/v1/borrow-requests/:id/reject/", async (request) => {
    const actor = await requirePermission(request, "borrowing.reject");
    return rejectRequest(uuidParam.parse(request.params).id, actor.id, rejectionInput.parse(request.body));
  });
  app.post("/api/v1/borrow-requests/:id/allocations/", async (request, reply) => {
    const actor = await requirePermission(request, "borrowing.allocate");
    return reply.code(201).send(await allocateAsset(uuidParam.parse(request.params).id, actor.id, allocationInput.parse(request.body)));
  });
  app.post("/api/v1/borrow-requests/:id/release/", async (request) => {
    const actor = await requirePermission(request, "custody.release");
    return releaseRequest(uuidParam.parse(request.params).id, actor.id, releaseInput.parse(request.body));
  });
  app.post("/api/v1/returns/", async (request, reply) => {
    const actor = await requirePermission(request, "custody.return");
    return reply.code(201).send(await processReturn(actor.id, returnInput.parse(request.body)));
  });
  app.get("/api/v1/custody/", async (request) => {
    const actor = await requireActiveProfile(request);
    if (actor.role === "admin") throw new AppError(403, "FORBIDDEN", "Custody records are restricted.");
    const { page, limit } = listQuery.parse(request.query);
    return listCustody(page, limit, actor.role === "student_faculty" ? actor.id : undefined);
  });
  app.get("/api/v1/overdue/", async (request) => {
    await requirePermission(request, "overdue.read");
    const { page, limit } = listQuery.parse(request.query);
    return listOverdue(page, limit);
  });
  app.get("/api/v1/accountability/", async (request) => {
    const actor = await requireActiveProfile(request);
    if (actor.role === "admin") throw new AppError(403, "FORBIDDEN", "Accountability records are restricted.");
    const { page, limit } = listQuery.parse(request.query);
    return listAccountability(page, limit, actor.role === "student_faculty" ? actor.id : undefined);
  });
}
