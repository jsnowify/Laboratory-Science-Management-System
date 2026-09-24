import { and, count, eq, ilike, ne, or } from "drizzle-orm";
import type { z } from "zod";
import { userListQuery, userStatusInput } from "@lsms/shared";
import { database } from "../../db";
import { auditLogs, notifications, users } from "../../db/introspected/schema";
import { AppError } from "../../lib/errors";
import { canSetStatus } from "./account-rules";

export async function listManageableUsers(
  input: z.infer<typeof userListQuery>,
) {
  const filter = and(
    ne(users.role, "super_admin"),
    input.status ? eq(users.accountStatus, input.status) : undefined,
    input.q
      ? or(
          ilike(users.firstName, `%${input.q}%`),
          ilike(users.lastName, `%${input.q}%`),
          ilike(users.institutionalId, `%${input.q}%`),
        )
      : undefined,
  );
  const [rows, totals] = await Promise.all([
    database()
      .select({
        id: users.id,
        institutionalId: users.institutionalId,
        role: users.role,
        personType: users.personType,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        accountStatus: users.accountStatus,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(filter)
      .orderBy(users.createdAt)
      .limit(input.limit)
      .offset((input.page - 1) * input.limit),
    database().select({ total: count() }).from(users).where(filter),
  ]);
  return {
    data: rows,
    total: totals[0].total,
    page: input.page,
    limit: input.limit,
  };
}

export async function changeUserStatus(
  id: string,
  input: z.infer<typeof userStatusInput>,
  actorId: string,
) {
  return database().transaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(users)
      .where(eq(users.id, id))
      .for("update")
      .limit(1);
    if (!target) throw new AppError(404, "NOT_FOUND", "User not found.");
    if (target.role === "super_admin")
      throw new AppError(
        403,
        "FORBIDDEN",
        "Super Admin accounts cannot be changed here.",
      );
    if (!canSetStatus(target.accountStatus, input.status))
      throw new AppError(
        409,
        "INVALID_STATUS",
        "This account status change is not allowed.",
      );
    const [row] = await tx
      .update(users)
      .set({
        accountStatus: input.status,
        archivedAt:
          input.status === "archived" ? new Date().toISOString() : null,
      })
      .where(eq(users.id, id))
      .returning({ id: users.id, accountStatus: users.accountStatus });
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorId,
        action: `user.${input.status}`,
        entityType: "users",
        entityId: id,
        metadata: { previousStatus: target.accountStatus },
      });
    await tx
      .insert(notifications)
      .values({
        userId: id,
        notificationType: "account_status",
        title: "Account status changed",
        message:
          input.status === "active"
            ? "Your LSMS account is active."
            : `Your LSMS account is ${input.status}.`,
        relatedEntityType: "users",
        relatedEntityId: id,
      });
    return row;
  });
}
