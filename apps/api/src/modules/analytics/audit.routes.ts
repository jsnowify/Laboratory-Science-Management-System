import type { FastifyInstance } from "fastify";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "../../auth/authorize";
import { database } from "../../db";
import {
  auditLogs,
  borrowAllocations,
  borrowRequestItems,
  borrowRequests,
  colleges,
  courses,
  departments,
  equipmentAssets,
  equipmentCatalog,
  equipmentCategories,
  isoRequisitions,
  returnRecords,
  users,
} from "../../db/introspected/schema";
import { auditScope } from "./audit-scope";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).default(""),
  role: z.enum(["admin", "student_faculty", "super_admin"]).optional(),
});

export async function auditRoutes(app: FastifyInstance) {
  app.get("/api/v1/audit/", async (request) => {
    const viewer = await requirePermission(request, "audit.read");
    const input = querySchema.parse(request.query);
    // Admins may inspect borrower activity only. Enforce this before paging/counting,
    // regardless of any role supplied in the query string.
    const scope = auditScope(
      viewer.role as "admin" | "super_admin",
      input.role,
    );
    const filter = and(
      scope.visibleRole ? eq(users.role, scope.visibleRole) : undefined,
      scope.deny ? sql`false` : undefined,
      input.q
        ? or(
            ilike(auditLogs.action, `%${input.q}%`),
            ilike(users.firstName, `%${input.q}%`),
            ilike(users.lastName, `%${input.q}%`),
            ilike(users.institutionalId, `%${input.q}%`),
            sql`${auditLogs.metadata}::text ilike ${`%${input.q}%`}`,
            sql`${auditLogs.entityId}::text ilike ${`%${input.q}%`}`,
          )
        : undefined,
    );
    const [rows, totals] = await Promise.all([
      database()
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
          actorId: auditLogs.actorUserId,
          actorFirstName: users.firstName,
          actorLastName: users.lastName,
          actorInstitutionalId: users.institutionalId,
          actorRole: users.role,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .where(filter)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit),
      database()
        .select({ total: count() })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .where(filter),
    ]);
    // Resolve record names for the current page so the audit screen never has to expose database UUIDs.
    const idsFor = (type: string) =>
      rows
        .filter((row) => row.entityType === type && row.entityId)
        .map((row) => row.entityId!);
    const names = new Map<string, string>();
    const addNames = (type: string, values: { id: string; label: string }[]) =>
      values.forEach((value) => names.set(`${type}:${value.id}`, value.label));
    await Promise.all([
      (async () => {
        const ids = idsFor("users");
        if (ids.length)
          addNames(
            "users",
            (
              await database()
                .select({
                  id: users.id,
                  firstName: users.firstName,
                  lastName: users.lastName,
                })
                .from(users)
                .where(inArray(users.id, ids))
            ).map((row) => ({
              id: row.id,
              label: `${row.firstName} ${row.lastName}`,
            })),
          );
      })(),
      (async () => {
        const ids = idsFor("colleges");
        if (ids.length)
          addNames(
            "colleges",
            await database()
              .select({ id: colleges.id, label: colleges.name })
              .from(colleges)
              .where(inArray(colleges.id, ids)),
          );
      })(),
      (async () => {
        const ids = idsFor("courses");
        if (ids.length)
          addNames(
            "courses",
            await database()
              .select({ id: courses.id, label: courses.name })
              .from(courses)
              .where(inArray(courses.id, ids)),
          );
      })(),
      (async () => {
        const ids = idsFor("departments");
        if (ids.length)
          addNames(
            "departments",
            await database()
              .select({ id: departments.id, label: departments.name })
              .from(departments)
              .where(inArray(departments.id, ids)),
          );
      })(),
      (async () => {
        const ids = idsFor("equipment_categories");
        if (ids.length)
          addNames(
            "equipment_categories",
            await database()
              .select({
                id: equipmentCategories.id,
                label: equipmentCategories.name,
              })
              .from(equipmentCategories)
              .where(inArray(equipmentCategories.id, ids)),
          );
      })(),
      (async () => {
        const ids = idsFor("equipment_catalog");
        if (ids.length)
          addNames(
            "equipment_catalog",
            await database()
              .select({
                id: equipmentCatalog.id,
                label: equipmentCatalog.equipmentName,
              })
              .from(equipmentCatalog)
              .where(inArray(equipmentCatalog.id, ids)),
          );
      })(),
      (async () => {
        const ids = idsFor("equipment_assets");
        if (ids.length)
          addNames(
            "equipment_assets",
            (
              await database()
                .select({
                  id: equipmentAssets.id,
                  code: equipmentAssets.assetCode,
                  equipment: equipmentCatalog.equipmentName,
                })
                .from(equipmentAssets)
                .innerJoin(
                  equipmentCatalog,
                  eq(equipmentAssets.equipmentCatalogId, equipmentCatalog.id),
                )
                .where(inArray(equipmentAssets.id, ids))
            ).map((row) => ({
              id: row.id,
              label: `${row.equipment} · ${row.code}`,
            })),
          );
      })(),
      (async () => {
        const ids = idsFor("borrow_requests");
        if (ids.length)
          addNames(
            "borrow_requests",
            (
              await database()
                .select({
                  id: borrowRequests.id,
                  number: borrowRequests.requestNumber,
                  borrowerFirst: users.firstName,
                  borrowerLast: users.lastName,
                })
                .from(borrowRequests)
                .innerJoin(users, eq(borrowRequests.borrowerId, users.id))
                .where(inArray(borrowRequests.id, ids))
            ).map((row) => ({
              id: row.id,
              label: `${row.number} · ${row.borrowerFirst} ${row.borrowerLast}`,
            })),
          );
      })(),
      (async () => {
        const ids = idsFor("borrow_allocations");
        if (ids.length)
          addNames(
            "borrow_allocations",
            (
              await database()
                .select({
                  id: borrowAllocations.id,
                  code: equipmentAssets.assetCode,
                  number: borrowRequests.requestNumber,
                })
                .from(borrowAllocations)
                .innerJoin(
                  equipmentAssets,
                  eq(borrowAllocations.equipmentAssetId, equipmentAssets.id),
                )
                .innerJoin(
                  borrowRequestItems,
                  eq(
                    borrowAllocations.borrowRequestItemId,
                    borrowRequestItems.id,
                  ),
                )
                .innerJoin(
                  borrowRequests,
                  eq(borrowRequestItems.borrowRequestId, borrowRequests.id),
                )
                .where(inArray(borrowAllocations.id, ids))
            ).map((row) => ({
              id: row.id,
              label: `${row.code} for request ${row.number}`,
            })),
          );
      })(),
      (async () => {
        const ids = idsFor("return_records");
        if (ids.length)
          addNames(
            "return_records",
            (
              await database()
                .select({
                  id: returnRecords.id,
                  code: equipmentAssets.assetCode,
                  number: borrowRequests.requestNumber,
                })
                .from(returnRecords)
                .innerJoin(
                  borrowAllocations,
                  eq(returnRecords.allocationId, borrowAllocations.id),
                )
                .innerJoin(
                  equipmentAssets,
                  eq(borrowAllocations.equipmentAssetId, equipmentAssets.id),
                )
                .innerJoin(
                  borrowRequestItems,
                  eq(
                    borrowAllocations.borrowRequestItemId,
                    borrowRequestItems.id,
                  ),
                )
                .innerJoin(
                  borrowRequests,
                  eq(borrowRequestItems.borrowRequestId, borrowRequests.id),
                )
                .where(inArray(returnRecords.id, ids))
            ).map((row) => ({
              id: row.id,
              label: `${row.code} for request ${row.number}`,
            })),
          );
      })(),
      (async () => {
        const ids = idsFor("iso_requisitions");
        if (ids.length)
          addNames(
            "iso_requisitions",
            await database()
              .select({
                id: isoRequisitions.id,
                label: isoRequisitions.formNumber,
              })
              .from(isoRequisitions)
              .where(inArray(isoRequisitions.id, ids)),
          );
      })(),
    ]);
    return {
      data: rows.map((row) => ({
        ...row,
        targetLabel: row.entityId
          ? (names.get(`${row.entityType}:${row.entityId}`) ?? null)
          : null,
      })),
      total: totals[0]?.total ?? 0,
      page: input.page,
      limit: input.limit,
    };
  });
}
