import { and, count, eq, ilike, isNull, or } from "drizzle-orm";
import type { z } from "zod";
import {
  assetInput,
  assetUpdate,
  catalogInput,
  catalogUpdate,
  categoryInput,
  categoryUpdate,
  equipmentListQuery,
} from "@lsms/shared";
import { database } from "../../db";
import {
  auditLogs,
  departments,
  equipmentAssets,
  equipmentCatalog,
  equipmentCategories,
  vwEquipmentAssetAvailability,
  vwEquipmentInventorySummary,
  vwEquipmentQrLookup,
} from "../../db/introspected/schema";
import { AppError } from "../../lib/errors";

type Query = z.infer<typeof equipmentListQuery>;

export async function listCategories(query: Query) {
  const filter = and(
    query.includeInactive ? undefined : eq(equipmentCategories.isActive, true),
    query.q ? ilike(equipmentCategories.name, `%${query.q}%`) : undefined,
  );
  const [data, totals] = await Promise.all([
    database()
      .select()
      .from(equipmentCategories)
      .where(filter)
      .orderBy(equipmentCategories.name)
      .limit(query.limit)
      .offset((query.page - 1) * query.limit),
    database()
      .select({ total: count() })
      .from(equipmentCategories)
      .where(filter),
  ]);
  return { data, total: totals[0].total, page: query.page, limit: query.limit };
}

export async function createCategory(
  input: z.infer<typeof categoryInput>,
  actorId: string,
) {
  return database().transaction(async (tx) => {
    const [row] = await tx
      .insert(equipmentCategories)
      .values(input)
      .returning();
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorId,
        action: "equipment_category.created",
        entityType: "equipment_categories",
        entityId: row.id,
      });
    return row;
  });
}

export async function updateCategory(
  id: string,
  input: z.infer<typeof categoryUpdate>,
  actorId: string,
) {
  return database().transaction(async (tx) => {
    const [row] = await tx
      .update(equipmentCategories)
      .set(input)
      .where(eq(equipmentCategories.id, id))
      .returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "Category not found.");
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorId,
        action: "equipment_category.updated",
        entityType: "equipment_categories",
        entityId: id,
      });
    return row;
  });
}

export async function listCatalog(query: Query) {
  const filter = and(
    query.includeInactive ? undefined : eq(equipmentCatalog.isActive, true),
    query.categoryId
      ? eq(equipmentCatalog.categoryId, query.categoryId)
      : undefined,
    query.q ? ilike(equipmentCatalog.equipmentName, `%${query.q}%`) : undefined,
  );
  const [data, totals] = await Promise.all([
    database()
      .select({
        id: equipmentCatalog.id,
        categoryId: equipmentCatalog.categoryId,
        equipmentName: equipmentCatalog.equipmentName,
        description: equipmentCatalog.description,
        manufacturer: equipmentCatalog.manufacturer,
        model: equipmentCatalog.model,
        unitOfMeasure: equipmentCatalog.unitOfMeasure,
        isActive: equipmentCatalog.isActive,
        totalUnits: vwEquipmentInventorySummary.totalUnits,
        availableUnits: vwEquipmentInventorySummary.availableUnits,
        borrowedUnits: vwEquipmentInventorySummary.borrowedUnits,
        reservedUnits: vwEquipmentInventorySummary.reservedUnits,
      })
      .from(equipmentCatalog)
      .leftJoin(
        vwEquipmentInventorySummary,
        eq(equipmentCatalog.id, vwEquipmentInventorySummary.equipmentCatalogId),
      )
      .where(filter)
      .orderBy(equipmentCatalog.equipmentName)
      .limit(query.limit)
      .offset((query.page - 1) * query.limit),
    database().select({ total: count() }).from(equipmentCatalog).where(filter),
  ]);
  return {
    data: data.map((row) => ({
      ...row,
      totalUnits: row.totalUnits ?? 0,
      availableUnits: row.availableUnits ?? 0,
      borrowedUnits: row.borrowedUnits ?? 0,
      reservedUnits: row.reservedUnits ?? 0,
    })),
    total: totals[0].total,
    page: query.page,
    limit: query.limit,
  };
}

async function requireActiveCategory(id: string) {
  const [row] = await database()
    .select({ id: equipmentCategories.id })
    .from(equipmentCategories)
    .where(
      and(
        eq(equipmentCategories.id, id),
        eq(equipmentCategories.isActive, true),
      ),
    )
    .limit(1);
  if (!row)
    throw new AppError(422, "INVALID_CATEGORY", "Choose an active category.");
}

export async function createCatalog(
  input: z.infer<typeof catalogInput>,
  actorId: string,
) {
  await requireActiveCategory(input.categoryId);
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(equipmentCatalog).values(input).returning();
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorId,
        action: "equipment_catalog.created",
        entityType: "equipment_catalog",
        entityId: row.id,
      });
    return row;
  });
}

export async function updateCatalog(
  id: string,
  input: z.infer<typeof catalogUpdate>,
  actorId: string,
) {
  if (input.categoryId) await requireActiveCategory(input.categoryId);
  return database().transaction(async (tx) => {
    const [row] = await tx
      .update(equipmentCatalog)
      .set({
        ...input,
        archivedAt:
          input.isActive === false
            ? new Date().toISOString()
            : input.isActive === true
              ? null
              : undefined,
      })
      .where(eq(equipmentCatalog.id, id))
      .returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "Catalog item not found.");
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorId,
        action: "equipment_catalog.updated",
        entityType: "equipment_catalog",
        entityId: id,
      });
    return row;
  });
}

export async function listAssets(query: Query) {
  const filter = and(
    query.includeInactive ? undefined : isNull(equipmentAssets.archivedAt),
    query.catalogId
      ? eq(equipmentAssets.equipmentCatalogId, query.catalogId)
      : undefined,
    query.q
      ? or(
          ilike(equipmentAssets.assetCode, `%${query.q}%`),
          ilike(equipmentAssets.serialNumber, `%${query.q}%`),
        )
      : undefined,
  );
  const [data, totals] = await Promise.all([
    database()
      .select({
        id: equipmentAssets.id,
        equipmentCatalogId: equipmentAssets.equipmentCatalogId,
        assetCode: equipmentAssets.assetCode,
        qrToken: equipmentAssets.qrToken,
        serialNumber: equipmentAssets.serialNumber,
        departmentId: equipmentAssets.departmentId,
        currentCondition: equipmentAssets.currentCondition,
        operationalStatus: equipmentAssets.operationalStatus,
        acquisitionDate: equipmentAssets.acquisitionDate,
        notes: equipmentAssets.notes,
        archivedAt: equipmentAssets.archivedAt,
        availabilityStatus: vwEquipmentAssetAvailability.availabilityStatus,
        equipmentName: vwEquipmentAssetAvailability.equipmentName,
      })
      .from(equipmentAssets)
      .leftJoin(
        vwEquipmentAssetAvailability,
        eq(equipmentAssets.id, vwEquipmentAssetAvailability.equipmentAssetId),
      )
      .where(filter)
      .orderBy(equipmentAssets.assetCode)
      .limit(query.limit)
      .offset((query.page - 1) * query.limit),
    database().select({ total: count() }).from(equipmentAssets).where(filter),
  ]);
  return { data, total: totals[0].total, page: query.page, limit: query.limit };
}

async function requireValidAssetRelations(input: {
  equipmentCatalogId?: string;
  departmentId?: string;
}) {
  if (input.equipmentCatalogId) {
    const [row] = await database()
      .select({ id: equipmentCatalog.id })
      .from(equipmentCatalog)
      .where(
        and(
          eq(equipmentCatalog.id, input.equipmentCatalogId),
          eq(equipmentCatalog.isActive, true),
        ),
      )
      .limit(1);
    if (!row)
      throw new AppError(
        422,
        "INVALID_CATALOG",
        "Choose an active catalog item.",
      );
  }
  if (input.departmentId) {
    const [row] = await database()
      .select({ id: departments.id })
      .from(departments)
      .where(
        and(
          eq(departments.id, input.departmentId),
          eq(departments.isActive, true),
        ),
      )
      .limit(1);
    if (!row)
      throw new AppError(
        422,
        "INVALID_DEPARTMENT",
        "Choose an active department.",
      );
  }
}

export async function createAsset(
  input: z.infer<typeof assetInput>,
  actorId: string,
) {
  await requireValidAssetRelations(input);
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(equipmentAssets).values(input).returning();
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorId,
        action: "equipment_asset.created",
        entityType: "equipment_assets",
        entityId: row.id,
      });
    return row;
  });
}

export async function updateAsset(
  id: string,
  input: z.infer<typeof assetUpdate>,
  actorId: string,
) {
  await requireValidAssetRelations(input);
  const { archive, ...changes } = input;
  return database().transaction(async (tx) => {
    const [row] = await tx
      .update(equipmentAssets)
      .set({
        ...changes,
        archivedAt: archive === true ? new Date().toISOString() : undefined,
      })
      .where(eq(equipmentAssets.id, id))
      .returning();
    if (!row)
      throw new AppError(404, "NOT_FOUND", "Equipment asset not found.");
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorId,
        action: archive
          ? "equipment_asset.archived"
          : "equipment_asset.updated",
        entityType: "equipment_assets",
        entityId: id,
      });
    return row;
  });
}

export async function lookupQr(token: string) {
  const [row] = await database()
    .select({
      assetCode: vwEquipmentQrLookup.assetCode,
      equipmentName: vwEquipmentQrLookup.equipmentName,
      categoryName: vwEquipmentQrLookup.categoryName,
      departmentName: vwEquipmentQrLookup.departmentName,
      currentCondition: vwEquipmentQrLookup.currentCondition,
      operationalStatus: vwEquipmentQrLookup.operationalStatus,
      availabilityStatus: vwEquipmentAssetAvailability.availabilityStatus,
    })
    .from(vwEquipmentQrLookup)
    .leftJoin(
      vwEquipmentAssetAvailability,
      eq(
        vwEquipmentQrLookup.equipmentAssetId,
        vwEquipmentAssetAvailability.equipmentAssetId,
      ),
    )
    .where(eq(vwEquipmentQrLookup.qrToken, token))
    .limit(1);
  if (!row)
    throw new AppError(404, "NOT_FOUND", "Equipment QR code not found.");
  return row;
}
