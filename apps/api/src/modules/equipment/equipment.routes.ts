import type { FastifyInstance } from "fastify";
import QRCode from "qrcode";
import { assetInput, assetUpdate, catalogInput, catalogUpdate, categoryInput, categoryUpdate, equipmentListQuery, uuidParam } from "@lsms/shared";
import { requireActiveProfile, requirePermission } from "../../auth/authorize";
import { database } from "../../db";
import { equipmentAssets } from "../../db/introspected/schema";
import { AppError } from "../../lib/errors";
import { serverEnv } from "../../lib/env";
import { eq } from "drizzle-orm";
import { createAsset, createCatalog, createCategory, listAssets, listCatalog, listCategories, lookupQr, updateAsset, updateCatalog, updateCategory } from "./equipment.service";

export async function equipmentRoutes(app: FastifyInstance) {
  app.get("/api/v1/equipment/categories/", async (request) => {
    await requirePermission(request, "equipment.read");
    const query = equipmentListQuery.parse(request.query);
    if (query.includeInactive) await requirePermission(request, "equipment.write");
    return listCategories(query);
  });
  app.post("/api/v1/equipment/categories/", async (request, reply) => {
    const actor = await requirePermission(request, "equipment.write");
    return reply.code(201).send(await createCategory(categoryInput.parse(request.body), actor.id));
  });
  app.patch("/api/v1/equipment/categories/:id/", async (request) => {
    const actor = await requirePermission(request, "equipment.write");
    return updateCategory(uuidParam.parse(request.params).id, categoryUpdate.parse(request.body), actor.id);
  });

  app.get("/api/v1/equipment/catalog/", async (request) => {
    await requirePermission(request, "equipment.read");
    const query = equipmentListQuery.parse(request.query);
    if (query.includeInactive) await requirePermission(request, "equipment.write");
    return listCatalog(query);
  });
  app.post("/api/v1/equipment/catalog/", async (request, reply) => {
    const actor = await requirePermission(request, "equipment.write");
    return reply.code(201).send(await createCatalog(catalogInput.parse(request.body), actor.id));
  });
  app.patch("/api/v1/equipment/catalog/:id/", async (request) => {
    const actor = await requirePermission(request, "equipment.write");
    return updateCatalog(uuidParam.parse(request.params).id, catalogUpdate.parse(request.body), actor.id);
  });

  app.get("/api/v1/equipment/assets/", async (request) => {
    const actor = await requireActiveProfile(request);
    if (actor.role === "student_faculty") throw new AppError(403, "FORBIDDEN", "Asset management is restricted to staff.");
    const query = equipmentListQuery.parse(request.query);
    if (query.includeInactive && actor.role !== "admin") throw new AppError(403, "FORBIDDEN", "Archived inventory is restricted to Admin.");
    return listAssets(query);
  });
  app.post("/api/v1/equipment/assets/", async (request, reply) => {
    const actor = await requirePermission(request, "equipment.write");
    return reply.code(201).send(await createAsset(assetInput.parse(request.body), actor.id));
  });
  app.patch("/api/v1/equipment/assets/:id/", async (request) => {
    const actor = await requirePermission(request, "equipment.write");
    return updateAsset(uuidParam.parse(request.params).id, assetUpdate.parse(request.body), actor.id);
  });
  app.get("/api/v1/equipment/assets/:id/qr/", async (request, reply) => {
    await requirePermission(request, "qr.manage");
    const id = uuidParam.parse(request.params).id;
    const [asset] = await database().select({ qrToken: equipmentAssets.qrToken }).from(equipmentAssets).where(eq(equipmentAssets.id, id)).limit(1);
    if (!asset) throw new AppError(404, "NOT_FOUND", "Equipment asset not found.");
    const url = `${serverEnv().FRONTEND_URL.replace(/\/$/, "")}/equipment/q/${asset.qrToken}/`;
    return reply.type("image/svg+xml").send(await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" }));
  });
  app.get("/api/v1/equipment/qr/:id/", async (request) => {
    await requireActiveProfile(request);
    return lookupQr(uuidParam.parse(request.params).id);
  });
}
