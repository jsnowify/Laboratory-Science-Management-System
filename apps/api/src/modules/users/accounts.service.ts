import { and, count, eq, ilike, ne, or, sql } from "drizzle-orm";
import type { z } from "zod";
import {
  profileUpdateInput,
  userListQuery,
  userStatusInput,
  type Role,
} from "@lsms/shared";
import { database } from "../../db";
import { authUser } from "../../db/auth-schema";
import { auditLogs, notifications, users } from "../../db/introspected/schema";
import { AppError } from "../../lib/errors";
import {
  canAdminChangeStatus,
  canSetStatus,
  canSuperAdminChangeStatus,
} from "./account-rules";

export async function listManageableUsers(
  input: z.infer<typeof userListQuery>,
  actorRole: Role,
) {
  const filter = and(
    actorRole === "admin"
      ? eq(users.role, "student_faculty")
      : input.role
        ? eq(users.role, input.role)
        : undefined,
    input.status ? eq(users.accountStatus, input.status) : undefined,
    input.q
      ? or(
          ilike(users.firstName, `%${input.q}%`),
          ilike(users.lastName, `%${input.q}%`),
          ilike(users.institutionalId, `%${input.q}%`),
          ilike(users.email, `%${input.q}%`),
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
        middleName: users.middleName,
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
  actorRole: Role,
) {
  return database().transaction(async (tx) => {
    if (actorRole === "super_admin")
      await tx.execute(sql`select pg_advisory_xact_lock(742611931)`);
    const [target] = await tx
      .select()
      .from(users)
      .where(eq(users.id, id))
      .for("update")
      .limit(1);
    if (!target) throw new AppError(404, "NOT_FOUND", "User not found.");
    if (
      actorRole === "admin" &&
      !canAdminChangeStatus(target.role, target.accountStatus, input.status)
    )
      throw new AppError(
        403,
        "FORBIDDEN",
        "Admins can only activate pending student or faculty accounts.",
      );
    if (actorRole !== "super_admin" && actorRole !== "admin")
      throw new AppError(
        403,
        "FORBIDDEN",
        "You cannot manage account statuses.",
      );
    let hasOtherActiveSuperAdmin = true;
    if (
      actorRole === "super_admin" &&
      target.role === "super_admin" &&
      target.accountStatus === "active" &&
      input.status !== "active"
    ) {
      const [other] = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, "super_admin"),
            eq(users.accountStatus, "active"),
            ne(users.id, id),
          ),
        )
        .limit(1);
      hasOtherActiveSuperAdmin = Boolean(other);
    }
    if (
      actorRole === "super_admin" &&
      !canSuperAdminChangeStatus(
        target.role,
        target.accountStatus,
        input.status,
        id === actorId,
        hasOtherActiveSuperAdmin,
      )
    ) {
      if (id === actorId)
        throw new AppError(
          409,
          "OWN_ACCOUNT",
          "You cannot suspend or archive your own account.",
        );
      if (!hasOtherActiveSuperAdmin)
        throw new AppError(
          409,
          "LAST_SUPER_ADMIN",
          "The last active Super Admin cannot be disabled.",
        );
      throw new AppError(
        409,
        "INVALID_STATUS",
        "This account status change is not allowed.",
      );
    }
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
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, id))
      .returning({ id: users.id, accountStatus: users.accountStatus });
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: `user.${input.status}`,
      entityType: "users",
      entityId: id,
      metadata: {
        previousStatus: target.accountStatus,
        newStatus: input.status,
        targetRole: target.role,
        targetInstitutionalId: target.institutionalId,
      },
    });
    await tx.insert(notifications).values({
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

export async function updateAccountDetails(
  id: string,
  input: z.infer<typeof profileUpdateInput>,
  actorId: string,
  actorRole: Role,
) {
  if (actorId !== id && actorRole !== "super_admin")
    throw new AppError(
      403,
      "FORBIDDEN",
      "You can only update your own profile.",
    );
  return database().transaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(users)
      .where(eq(users.id, id))
      .for("update")
      .limit(1);
    if (!target) throw new AppError(404, "NOT_FOUND", "User not found.");
    if (!target.authUserId)
      throw new AppError(
        409,
        "AUTH_MISSING",
        "This account has no sign-in record.",
      );
    const [duplicate] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);
    if (duplicate && duplicate.id !== id)
      throw new AppError(
        409,
        "EMAIL_EXISTS",
        "That email address is already in use.",
      );
    const fullName = [input.firstName, input.middleName, input.lastName]
      .filter(Boolean)
      .join(" ");
    const [authRow] = await tx
      .update(authUser)
      .set({
        name: fullName,
        email: input.email,
        emailVerified:
          target.email.toLowerCase() === input.email ? undefined : false,
        updatedAt: new Date(),
      })
      .where(eq(authUser.id, target.authUserId))
      .returning({ id: authUser.id });
    if (!authRow)
      throw new AppError(
        409,
        "AUTH_MISSING",
        "This account has no sign-in record.",
      );
    const [row] = await tx
      .update(users)
      .set({
        firstName: input.firstName,
        middleName: input.middleName || null,
        lastName: input.lastName,
        email: input.email,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        firstName: users.firstName,
        middleName: users.middleName,
        lastName: users.lastName,
        email: users.email,
      });
    await tx
      .insert(auditLogs)
      .values({
        actorUserId: actorId,
        action: actorId === id ? "profile.updated" : "user.profile_updated",
        entityType: "users",
        entityId: id,
        metadata: {
          targetInstitutionalId: target.institutionalId,
          changedFields: [
            "firstName",
            "middleName",
            "lastName",
            "email",
          ].filter(
            (field) =>
              String(target[field as keyof typeof target] ?? "") !==
              String(input[field as keyof typeof input] ?? ""),
          ),
        },
      });
    return row;
  });
}
