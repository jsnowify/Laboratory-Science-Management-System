import { createHash } from "node:crypto";
import { eq, desc, count } from "drizzle-orm";
import { database } from "../../db";
import {
  auditLogs,
  isoRequisitions,
  borrowRequests,
} from "../../db/introspected/schema";
import { AppError } from "../../lib/errors";
import { documentStorage } from "../../lib/storage";
import { getRequest } from "../borrowing/requests.service";
import { renderDevelopmentRequisition } from "./requisition.pdf";

export async function createRequisition(requestId: string, actorId: string) {
  const record = await database().transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(borrowRequests)
      .where(eq(borrowRequests.id, requestId))
      .for("update")
      .limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (
      ![
        "approved",
        "ready_for_release",
        "borrowed",
        "partially_returned",
        "returned",
      ].includes(request.status)
    )
      throw new AppError(
        409,
        "INVALID_STATUS",
        "Approve the request before generating a requisition.",
      );
    const [existing] = await tx
      .select()
      .from(isoRequisitions)
      .where(eq(isoRequisitions.borrowRequestId, requestId))
      .limit(1);
    if (existing) return existing;
    const [row] = await tx
      .insert(isoRequisitions)
      .values({ borrowRequestId: requestId, generatedBy: actorId })
      .returning();
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorId,
        action: "iso_requisition.generated",
        entityType: "iso_requisitions",
        entityId: row.id,
      });
    return row;
  });
  let storageStatus = "stored";
  try {
    const bytes = await generateRequisitionPdf(record.id, actorId);
    const key = `${record.id}.pdf`;
    await documentStorage.put(key, bytes);
    await database()
      .update(isoRequisitions)
      .set({
        storageBucket: "local",
        storagePath: key,
        documentHash: createHash("sha256").update(bytes).digest("hex"),
      })
      .where(eq(isoRequisitions.id, record.id));
  } catch {
    storageStatus = "regeneration_only";
  }
  return { ...record, storageStatus };
}

export async function generateRequisitionPdf(id: string, actorId: string) {
  const [record] = await database()
    .select()
    .from(isoRequisitions)
    .where(eq(isoRequisitions.id, id))
    .limit(1);
  if (!record) throw new AppError(404, "NOT_FOUND", "Requisition not found.");
  const request = await getRequest(record.borrowRequestId, {
    id: actorId,
    role: "super_admin",
  });
  return renderDevelopmentRequisition({
    formNumber: record.formNumber,
    requestNumber: request.requestNumber,
    borrower: `${request.firstName} ${request.lastName}`,
    institutionalId: request.institutionalId,
    purpose: request.purpose,
    requestedBorrowAt: request.requestedBorrowAt,
    requestedDueAt: request.requestedDueAt,
    generatedAt: record.generatedAt,
    items: request.items.map((item) => ({
      equipmentName: item.equipmentName,
      quantityApproved: item.quantityApproved,
      assetCodes: request.allocations
        .filter((allocation) => allocation.borrowRequestItemId === item.id)
        .map((allocation) => allocation.assetCode),
    })),
  });
}

export async function listRequisitions(page: number, limit: number) {
  const [data, totals] = await Promise.all([
    database()
      .select({
        id: isoRequisitions.id,
        formNumber: isoRequisitions.formNumber,
        borrowRequestId: isoRequisitions.borrowRequestId,
        generatedAt: isoRequisitions.generatedAt,
        releasedAt: isoRequisitions.releasedAt,
        requestNumber: borrowRequests.requestNumber,
      })
      .from(isoRequisitions)
      .innerJoin(
        borrowRequests,
        eq(isoRequisitions.borrowRequestId, borrowRequests.id),
      )
      .orderBy(desc(isoRequisitions.generatedAt))
      .limit(limit)
      .offset((page - 1) * limit),
    database().select({ total: count() }).from(isoRequisitions),
  ]);
  return { data, total: totals[0].total, page, limit };
}

export async function markRequisitionReleased(id: string, actorId: string) {
  return database().transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(isoRequisitions)
      .where(eq(isoRequisitions.id, id))
      .for("update")
      .limit(1);
    if (!record) throw new AppError(404, "NOT_FOUND", "Requisition not found.");
    if (record.releasedAt)
      throw new AppError(
        409,
        "ALREADY_RELEASED",
        "This requisition was already marked released.",
      );
    const [updated] = await tx
      .update(isoRequisitions)
      .set({ releasedAt: new Date().toISOString() })
      .where(eq(isoRequisitions.id, id))
      .returning();
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorId,
        action: "iso_requisition.released",
        entityType: "iso_requisitions",
        entityId: id,
      });
    return updated;
  });
}
