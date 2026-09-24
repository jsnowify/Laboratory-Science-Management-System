import type { FastifyInstance } from "fastify";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { listQuery, uuidParam } from "@lsms/shared";
import { requireActiveProfile } from "../../auth/authorize";
import { database } from "../../db";
import { notifications } from "../../db/introspected/schema";
import { AppError } from "../../lib/errors";

export async function notificationRoutes(app: FastifyInstance) {
  app.get("/api/v1/notifications/", async (request) => {
    const actor = await requireActiveProfile(request);
    const { page, limit } = listQuery.parse(request.query);
    const [data, totals, unread] = await Promise.all([
      database().select().from(notifications).where(eq(notifications.userId, actor.id)).orderBy(desc(notifications.createdAt))
        .limit(limit).offset((page - 1) * limit),
      database().select({ total: count() }).from(notifications).where(eq(notifications.userId, actor.id)),
      database().select({ total: count() }).from(notifications).where(and(eq(notifications.userId, actor.id), isNull(notifications.readAt))),
    ]);
    return { data, total: totals[0].total, unreadCount: unread[0].total, page, limit };
  });
  app.post("/api/v1/notifications/:id/read/", async (request) => {
    const actor = await requireActiveProfile(request);
    const id = uuidParam.parse(request.params).id;
    const [row] = await database().update(notifications).set({ readAt: new Date().toISOString() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, actor.id))).returning({ id: notifications.id });
    if (!row) throw new AppError(404, "NOT_FOUND", "Notification not found.");
    return row;
  });
  app.post("/api/v1/notifications/read-all/", async (request) => {
    const actor = await requireActiveProfile(request);
    await database().update(notifications).set({ readAt: new Date().toISOString() })
      .where(and(eq(notifications.userId, actor.id), isNull(notifications.readAt)));
    return { ok: true };
  });
}
