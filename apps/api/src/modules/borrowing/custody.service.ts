import { and, count, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { allocationInput, releaseInput, returnInput } from "@lsms/shared";
import { database } from "../../db";
import { auditLogs, borrowAllocations, borrowRequestItems, borrowRequests, equipmentAssets, notifications, returnRecords, vwAccountabilityRecords, vwCurrentCustody, vwOverdueLoans } from "../../db/introspected/schema";
import { AppError } from "../../lib/errors";
import { returnRequestStatus } from "./rules";

export async function allocateAsset(requestId: string, actorId: string, input: z.infer<typeof allocationInput>) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq(borrowRequests.id, requestId)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "approved" && request.status !== "ready_for_release") throw new AppError(409, "INVALID_STATUS", "Approve the request before allocating assets.");
    const [item] = await tx.select().from(borrowRequestItems).where(eq(borrowRequestItems.id, input.itemId)).for("update").limit(1);
    if (!item || item.borrowRequestId !== requestId || !item.quantityApproved) throw new AppError(422, "INVALID_ITEM", "Choose an approved request item.");
    const [asset] = await tx.select().from(equipmentAssets).where(eq(equipmentAssets.id, input.assetId)).limit(1);
    if (!asset || asset.equipmentCatalogId !== item.equipmentCatalogId || asset.operationalStatus !== "active" || asset.archivedAt)
      throw new AppError(422, "INVALID_ASSET", "Choose an active, compatible physical asset.");
    const [overlap] = await tx.select({ id: borrowAllocations.id }).from(borrowAllocations)
      .where(and(eq(borrowAllocations.equipmentAssetId, input.assetId), inArray(borrowAllocations.allocationStatus, ["reserved", "released"]),
        sql`${borrowAllocations.reservationPeriod} && tstzrange(${request.requestedBorrowAt}::timestamptz, ${request.requestedDueAt}::timestamptz, '[)')`)).limit(1);
    if (overlap) throw new AppError(409, "ALLOCATION_CONFLICT", "This equipment is already reserved for an overlapping schedule.");
    const [allocated] = await tx.select({ total: count() }).from(borrowAllocations)
      .where(and(eq(borrowAllocations.borrowRequestItemId, item.id), inArray(borrowAllocations.allocationStatus, ["reserved", "released"])));
    if (allocated.total >= item.quantityApproved) throw new AppError(409, "QUANTITY_FILLED", "This item already has its approved number of assets.");
    const [row] = await tx.insert(borrowAllocations).values({ borrowRequestItemId: item.id, equipmentAssetId: asset.id,
      reservationPeriod: sql`tstzrange(${request.requestedBorrowAt}::timestamptz, ${request.requestedDueAt}::timestamptz, '[)')`,
      allocatedBy: actorId }).returning();
    const items = await tx.select({ id: borrowRequestItems.id, quantityApproved: borrowRequestItems.quantityApproved })
      .from(borrowRequestItems).where(eq(borrowRequestItems.borrowRequestId, requestId));
    const [total] = await tx.select({ value: count() }).from(borrowAllocations)
      .innerJoin(borrowRequestItems, eq(borrowAllocations.borrowRequestItemId, borrowRequestItems.id))
      .where(and(eq(borrowRequestItems.borrowRequestId, requestId), inArray(borrowAllocations.allocationStatus, ["reserved", "released"])));
    if (total.value === items.reduce((sum, current) => sum + (current.quantityApproved ?? 0), 0) && request.status === "approved") {
      await tx.update(borrowRequests).set({ status: "ready_for_release" }).where(eq(borrowRequests.id, requestId));
      await tx.insert(notifications).values({ userId: request.borrowerId, notificationType: "ready_for_release", title: "Equipment ready for release",
        message: `Request ${request.requestNumber} has been allocated.`, relatedEntityType: "borrow_requests", relatedEntityId: requestId });
    }
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "equipment_asset.allocated", entityType: "borrow_allocations", entityId: row.id,
      metadata: { requestId, assetId: asset.id } });
    return row;
  });
}

export async function releaseRequest(requestId: string, actorId: string, input: z.infer<typeof releaseInput>) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq(borrowRequests.id, requestId)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "ready_for_release") throw new AppError(409, "INVALID_STATUS", "All approved assets must be allocated before release.");
    const allocations = await tx.select({ id: borrowAllocations.id, allocationStatus: borrowAllocations.allocationStatus })
      .from(borrowAllocations).innerJoin(borrowRequestItems, eq(borrowAllocations.borrowRequestItemId, borrowRequestItems.id))
      .where(eq(borrowRequestItems.borrowRequestId, requestId));
    if (allocations.length !== input.allocations.length || allocations.some((row) => row.allocationStatus !== "reserved" || !input.allocations.some((item) => item.allocationId === row.id)))
      throw new AppError(422, "INVALID_ALLOCATIONS", "Release every reserved asset in this request together.");
    const releasedAt = new Date().toISOString();
    for (const item of input.allocations) {
      await tx.update(borrowAllocations).set({ allocationStatus: "released", releasedBy: actorId, releasedAt,
        releaseCondition: item.condition, releaseNotes: item.notes ?? null }).where(eq(borrowAllocations.id, item.allocationId));
    }
    const [updated] = await tx.update(borrowRequests).set({ status: "borrowed" }).where(eq(borrowRequests.id, requestId)).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "equipment.released", entityType: "borrow_requests", entityId: requestId });
    await tx.insert(notifications).values({ userId: request.borrowerId, notificationType: "equipment_released", title: "Equipment released",
      message: `Equipment for request ${request.requestNumber} has been released.`, relatedEntityType: "borrow_requests", relatedEntityId: requestId });
    return updated;
  });
}

export async function processReturn(actorId: string, input: z.infer<typeof returnInput>) {
  return database().transaction(async (tx) => {
    const [allocation] = await tx.select({ id: borrowAllocations.id, allocationStatus: borrowAllocations.allocationStatus,
      borrowRequestId: borrowRequestItems.borrowRequestId }).from(borrowAllocations)
      .innerJoin(borrowRequestItems, eq(borrowAllocations.borrowRequestItemId, borrowRequestItems.id))
      .where(eq(borrowAllocations.id, input.allocationId)).for("update").limit(1);
    if (!allocation) throw new AppError(404, "NOT_FOUND", "Custody record not found.");
    if (allocation.allocationStatus !== "released") throw new AppError(409, "INVALID_STATUS", "Only released equipment can be returned.");
    const [request] = await tx.select().from(borrowRequests).where(eq(borrowRequests.id, allocation.borrowRequestId)).for("update").limit(1);
    if (!request || (request.status !== "borrowed" && request.status !== "partially_returned"))
      throw new AppError(409, "INVALID_STATUS", "This request is not in active custody.");
    const [record] = await tx.insert(returnRecords).values({ allocationId: allocation.id, processedBy: actorId,
      conditionAfter: input.conditionAfter, outcome: input.outcome, remarks: input.remarks ?? null }).returning();
    const [totals] = await tx.select({ total: count(), returned: sql<number>`count(*) filter (where ${borrowAllocations.allocationStatus} = 'returned')::int` })
      .from(borrowAllocations).innerJoin(borrowRequestItems, eq(borrowAllocations.borrowRequestItemId, borrowRequestItems.id))
      .where(and(eq(borrowRequestItems.borrowRequestId, request.id), inArray(borrowAllocations.allocationStatus, ["released", "returned"])));
    const status = returnRequestStatus(totals.total, totals.returned);
    await tx.update(borrowRequests).set({ status }).where(eq(borrowRequests.id, request.id));
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "equipment.returned", entityType: "return_records", entityId: record.id,
      metadata: { requestId: request.id, allocationId: allocation.id, outcome: input.outcome } });
    await tx.insert(notifications).values({ userId: request.borrowerId, notificationType: "equipment_returned", title: "Equipment return recorded",
      message: `A physical asset from request ${request.requestNumber} was returned.`, relatedEntityType: "borrow_requests", relatedEntityId: request.id });
    return { record, requestStatus: status };
  });
}

export async function listCustody(page: number, limit: number, borrowerId?: string) {
  const filter = borrowerId ? eq(vwCurrentCustody.borrowerId, borrowerId) : undefined;
  const [data, totals] = await Promise.all([
    database().select().from(vwCurrentCustody).where(filter).orderBy(vwCurrentCustody.dueAt).limit(limit).offset((page - 1) * limit),
    database().select({ total: count() }).from(vwCurrentCustody).where(filter),
  ]);
  return { data, total: totals[0].total, page, limit };
}

export async function listOverdue(page: number, limit: number) {
  const [data, totals] = await Promise.all([
    database().select().from(vwOverdueLoans).orderBy(vwOverdueLoans.dueAt).limit(limit).offset((page - 1) * limit),
    database().select({ total: count() }).from(vwOverdueLoans),
  ]);
  return { data, total: totals[0].total, page, limit };
}

export async function listAccountability(page: number, limit: number, borrowerId?: string) {
  const filter = borrowerId ? eq(vwAccountabilityRecords.borrowerId, borrowerId) : undefined;
  const [data, totals] = await Promise.all([
    database().select().from(vwAccountabilityRecords).where(filter).orderBy(vwAccountabilityRecords.releasedAt).limit(limit).offset((page - 1) * limit),
    database().select({ total: count() }).from(vwAccountabilityRecords).where(filter),
  ]);
  return { data, total: totals[0].total, page, limit };
}
