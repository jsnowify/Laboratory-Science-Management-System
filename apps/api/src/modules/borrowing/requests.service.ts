import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { z } from "zod";
import { approvalInput, borrowListQuery, borrowRequestInput, rejectionInput, reviewInput } from "@lsms/shared";
import { database } from "../../db";
import { auditLogs, borrowAllocations, borrowRequestItems, borrowRequestStatusHistory, borrowRequests, equipmentAssets, equipmentCatalog, notifications, users } from "../../db/introspected/schema";
import { AppError } from "../../lib/errors";
import { canCancelRequest, validApproval } from "./rules";

type RequestInput = z.infer<typeof borrowRequestInput>;
type ListInput = z.infer<typeof borrowListQuery>;

function validateSchedule(input: RequestInput) {
  if (Date.parse(input.requestedBorrowAt) < Date.now() - 60_000) throw new AppError(422, "INVALID_SCHEDULE", "Borrow date must be in the future.");
}

export async function createDraft(input: RequestInput, borrowerId: string) {
  validateSchedule(input);
  return database().transaction(async (tx) => {
    const ids = input.items.map((item) => item.equipmentCatalogId);
    const activeCatalog = await tx.select({ id: equipmentCatalog.id }).from(equipmentCatalog)
      .where(and(inArray(equipmentCatalog.id, ids), eq(equipmentCatalog.isActive, true)));
    if (activeCatalog.length !== ids.length) throw new AppError(422, "INVALID_EQUIPMENT", "Choose active equipment types.");
    const [request] = await tx.insert(borrowRequests).values({ borrowerId, purpose: input.purpose,
      requestedBorrowAt: input.requestedBorrowAt, requestedDueAt: input.requestedDueAt }).returning();
    await tx.insert(borrowRequestItems).values(input.items.map((item) => ({ ...item, borrowRequestId: request.id })));
    await tx.insert(auditLogs).values({ actorUserId: borrowerId, action: "borrow_request.draft_created", entityType: "borrow_requests", entityId: request.id });
    return request;
  });
}

export async function updateDraft(id: string, input: RequestInput, borrowerId: string) {
  validateSchedule(input);
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq(borrowRequests.id, id)).for("update").limit(1);
    if (!request || request.borrowerId !== borrowerId) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "draft") throw new AppError(409, "INVALID_STATUS", "Only draft requests can be edited.");
    const ids = input.items.map((item) => item.equipmentCatalogId);
    const activeCatalog = await tx.select({ id: equipmentCatalog.id }).from(equipmentCatalog)
      .where(and(inArray(equipmentCatalog.id, ids), eq(equipmentCatalog.isActive, true)));
    if (activeCatalog.length !== ids.length) throw new AppError(422, "INVALID_EQUIPMENT", "Choose active equipment types.");
    await tx.delete(borrowRequestItems).where(eq(borrowRequestItems.borrowRequestId, id));
    await tx.insert(borrowRequestItems).values(input.items.map((item) => ({ ...item, borrowRequestId: id })));
    const [updated] = await tx.update(borrowRequests).set({ purpose: input.purpose, requestedBorrowAt: input.requestedBorrowAt,
      requestedDueAt: input.requestedDueAt }).where(eq(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: borrowerId, action: "borrow_request.draft_updated", entityType: "borrow_requests", entityId: id });
    return updated;
  });
}

export async function listRequests(input: ListInput, actor: { id: string; role: string }) {
  if (actor.role === "admin") throw new AppError(403, "FORBIDDEN", "Borrowing operations are restricted to the Super Admin.");
  const filter = and(actor.role === "student_faculty" ? eq(borrowRequests.borrowerId, actor.id) : undefined,
    input.status ? eq(borrowRequests.status, input.status) : undefined,
    input.q ? or(ilike(borrowRequests.requestNumber, `%${input.q}%`), ilike(borrowRequests.purpose, `%${input.q}%`)) : undefined);
  const [data, totals] = await Promise.all([
    database().select({ id: borrowRequests.id, requestNumber: borrowRequests.requestNumber, borrowerId: borrowRequests.borrowerId,
      purpose: borrowRequests.purpose, requestedBorrowAt: borrowRequests.requestedBorrowAt, requestedDueAt: borrowRequests.requestedDueAt,
      status: borrowRequests.status, createdAt: borrowRequests.createdAt, institutionalId: users.institutionalId,
      firstName: users.firstName, lastName: users.lastName })
      .from(borrowRequests).innerJoin(users, eq(borrowRequests.borrowerId, users.id)).where(filter)
      .orderBy(desc(borrowRequests.createdAt)).limit(input.limit).offset((input.page - 1) * input.limit),
    database().select({ total: count() }).from(borrowRequests).where(filter),
  ]);
  return { data, total: totals[0].total, page: input.page, limit: input.limit };
}

export async function getRequest(id: string, actor: { id: string; role: string }) {
  if (actor.role === "admin") throw new AppError(403, "FORBIDDEN", "Borrowing operations are restricted to the Super Admin.");
  const [request] = await database().select({ id: borrowRequests.id, requestNumber: borrowRequests.requestNumber,
    borrowerId: borrowRequests.borrowerId, purpose: borrowRequests.purpose, requestedBorrowAt: borrowRequests.requestedBorrowAt,
    requestedDueAt: borrowRequests.requestedDueAt, status: borrowRequests.status, reviewNotes: borrowRequests.reviewNotes,
    rejectionReason: borrowRequests.rejectionReason, createdAt: borrowRequests.createdAt,
    institutionalId: users.institutionalId, firstName: users.firstName, lastName: users.lastName })
    .from(borrowRequests).innerJoin(users, eq(borrowRequests.borrowerId, users.id)).where(eq(borrowRequests.id, id)).limit(1);
  if (!request || (actor.role === "student_faculty" && request.borrowerId !== actor.id)) throw new AppError(404, "NOT_FOUND", "Request not found.");
  const [items, history] = await Promise.all([
    database().select({ id: borrowRequestItems.id, equipmentCatalogId: borrowRequestItems.equipmentCatalogId,
      equipmentName: equipmentCatalog.equipmentName, quantityRequested: borrowRequestItems.quantityRequested,
      quantityApproved: borrowRequestItems.quantityApproved })
      .from(borrowRequestItems).innerJoin(equipmentCatalog, eq(borrowRequestItems.equipmentCatalogId, equipmentCatalog.id))
      .where(eq(borrowRequestItems.borrowRequestId, id)),
    database().select({ newStatus: borrowRequestStatusHistory.newStatus, changedAt: borrowRequestStatusHistory.changedAt,
      remarks: borrowRequestStatusHistory.remarks }).from(borrowRequestStatusHistory)
      .where(eq(borrowRequestStatusHistory.borrowRequestId, id)).orderBy(desc(borrowRequestStatusHistory.changedAt)),
  ]);
  const allocations = actor.role === "super_admin" ? await database().select({ id: borrowAllocations.id,
    borrowRequestItemId: borrowAllocations.borrowRequestItemId, equipmentAssetId: borrowAllocations.equipmentAssetId,
    assetCode: equipmentAssets.assetCode, allocationStatus: borrowAllocations.allocationStatus, releaseCondition: borrowAllocations.releaseCondition,
    releasedAt: borrowAllocations.releasedAt }).from(borrowAllocations).innerJoin(equipmentAssets, eq(borrowAllocations.equipmentAssetId, equipmentAssets.id))
    .where(inArray(borrowAllocations.borrowRequestItemId, items.map((item) => item.id))) : [];
  return { ...request, items, history, allocations };
}

export async function submitRequest(id: string, borrowerId: string) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq(borrowRequests.id, id)).for("update").limit(1);
    if (!request || request.borrowerId !== borrowerId) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "draft") throw new AppError(409, "INVALID_STATUS", "Only draft requests can be submitted.");
    if (Date.parse(request.requestedBorrowAt) < Date.now() - 60_000) throw new AppError(422, "INVALID_SCHEDULE", "Borrow date must be in the future.");
    const [itemCount] = await tx.select({ value: count() }).from(borrowRequestItems).where(eq(borrowRequestItems.borrowRequestId, id));
    if (itemCount.value < 1) throw new AppError(422, "EMPTY_REQUEST", "Add equipment before submitting.");
    const [updated] = await tx.update(borrowRequests).set({ status: "submitted", submittedAt: new Date().toISOString() }).where(eq(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: borrowerId, action: "borrow_request.submitted", entityType: "borrow_requests", entityId: id });
    await tx.insert(notifications).values({ userId: borrowerId, notificationType: "request_submitted", title: "Borrowing request submitted",
      message: `Request ${request.requestNumber} was submitted.`, relatedEntityType: "borrow_requests", relatedEntityId: id });
    return updated;
  });
}

export async function cancelRequest(id: string, borrowerId: string) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq(borrowRequests.id, id)).for("update").limit(1);
    if (!request || request.borrowerId !== borrowerId) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (!canCancelRequest(request.status)) throw new AppError(409, "INVALID_STATUS", "This request can no longer be cancelled.");
    const [updated] = await tx.update(borrowRequests).set({ status: "cancelled" }).where(eq(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: borrowerId, action: "borrow_request.cancelled", entityType: "borrow_requests", entityId: id });
    return updated;
  });
}

export async function startReview(id: string, actorId: string, input: z.infer<typeof reviewInput>) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq(borrowRequests.id, id)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "submitted") throw new AppError(409, "INVALID_STATUS", "Only submitted requests can move under review.");
    const [updated] = await tx.update(borrowRequests).set({ status: "under_review", reviewedBy: actorId, reviewedAt: new Date().toISOString(), reviewNotes: input.notes ?? null }).where(eq(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "borrow_request.review_started", entityType: "borrow_requests", entityId: id });
    return updated;
  });
}

export async function approveRequest(id: string, actorId: string, input: z.infer<typeof approvalInput>) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq(borrowRequests.id, id)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "submitted" && request.status !== "under_review") throw new AppError(409, "INVALID_STATUS", "This request cannot be approved.");
    const items = await tx.select().from(borrowRequestItems).where(eq(borrowRequestItems.borrowRequestId, id));
    if (items.length !== input.items.length || new Set(input.items.map((item) => item.itemId)).size !== items.length)
      throw new AppError(422, "INVALID_ITEMS", "Provide an approved quantity for every requested item.");
    for (const item of items) {
      const approval = input.items.find((candidate) => candidate.itemId === item.id);
      if (!approval || !validApproval(item.quantityRequested, approval.quantityApproved))
        throw new AppError(422, "INVALID_QUANTITY", "Approved quantities must be between zero and the requested quantities.");
      await tx.update(borrowRequestItems).set({ quantityApproved: approval.quantityApproved }).where(eq(borrowRequestItems.id, item.id));
    }
    const [updated] = await tx.update(borrowRequests).set({ status: "approved", reviewedBy: actorId,
      reviewedAt: new Date().toISOString(), reviewNotes: input.notes ?? null }).where(eq(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "borrow_request.approved", entityType: "borrow_requests", entityId: id,
      metadata: { quantities: input.items.map((item) => ({ itemId: item.itemId, quantityApproved: item.quantityApproved })) } });
    await tx.insert(notifications).values({ userId: request.borrowerId, notificationType: "request_approved", title: "Borrowing request approved",
      message: `Request ${request.requestNumber} was approved.`, relatedEntityType: "borrow_requests", relatedEntityId: id });
    return updated;
  });
}

export async function rejectRequest(id: string, actorId: string, input: z.infer<typeof rejectionInput>) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq(borrowRequests.id, id)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "submitted" && request.status !== "under_review") throw new AppError(409, "INVALID_STATUS", "This request cannot be rejected.");
    const [updated] = await tx.update(borrowRequests).set({ status: "rejected", reviewedBy: actorId,
      reviewedAt: new Date().toISOString(), reviewNotes: input.notes ?? null, rejectionReason: input.reason }).where(eq(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "borrow_request.rejected", entityType: "borrow_requests", entityId: id });
    await tx.insert(notifications).values({ userId: request.borrowerId, notificationType: "request_rejected", title: "Borrowing request rejected",
      message: `Request ${request.requestNumber} was rejected.`, relatedEntityType: "borrow_requests", relatedEntityId: id });
    return updated;
  });
}
