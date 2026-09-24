import { timingSafeEqual } from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import { registrationInput, setupInput, staffInput } from "@lsms/shared";
import type { z } from "zod";
import { auth } from "../../auth/auth";
import { database } from "../../db";
import { authUser } from "../../db/auth-schema";
import {
  auditLogs,
  colleges,
  courses,
  departments,
  users,
} from "../../db/introspected/schema";
import { serverEnv } from "../../lib/env";
import { AppError } from "../../lib/errors";

function equalSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function setupAvailable() {
  const [existing] = await database()
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.role, "super_admin"), eq(users.accountStatus, "active")),
    )
    .limit(1);
  return !existing;
}

export async function createFirstSuperAdmin(input: z.infer<typeof setupInput>) {
  if (!equalSecret(input.setupToken, serverEnv().INITIAL_SETUP_TOKEN)) {
    throw new AppError(
      403,
      "INVALID_SETUP_TOKEN",
      "The setup token is invalid.",
    );
  }
  let authId: string | undefined;
  try {
    return await database().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(742611930)`);
      const [existing] = await tx
        .select({ id: users.id })
        .from(users)
        .where(
          and(eq(users.role, "super_admin"), eq(users.accountStatus, "active")),
        )
        .limit(1);
      if (existing)
        throw new AppError(
          409,
          "SETUP_COMPLETE",
          "First-run setup is already complete.",
        );
      const result = await auth.api.signUpEmail({
        body: {
          name: [input.firstName, input.middleName, input.lastName]
            .filter(Boolean)
            .join(" "),
          email: input.email,
          password: input.password,
        },
      });
      authId = result.user.id;
      const [profile] = await tx
        .insert(users)
        .values({
          authUserId: authId,
          institutionalId: input.institutionalId,
          role: "super_admin",
          firstName: input.firstName,
          middleName: input.middleName ?? null,
          lastName: input.lastName,
          email: input.email,
          accountStatus: "active",
        })
        .returning({ id: users.id });
      await tx
        .insert(auditLogs)
        .values({
          actorUserId: profile.id,
          action: "first_super_admin_created",
          entityType: "users",
          entityId: profile.id,
        });
      return { id: profile.id };
    });
  } catch (error) {
    if (authId)
      await database()
        .delete(authUser)
        .where(eq(authUser.id, authId))
        .catch(() => undefined);
    throw error;
  }
}

export async function registerStudentFaculty(
  input: z.infer<typeof registrationInput>,
) {
  let authId: string | undefined;
  try {
    return await database().transaction(async (tx) => {
      const [college] = await tx
        .select({ id: colleges.id })
        .from(colleges)
        .where(
          and(eq(colleges.id, input.collegeId), eq(colleges.isActive, true)),
        )
        .limit(1);
      if (!college)
        throw new AppError(422, "INVALID_COLLEGE", "Choose an active college.");
      if (input.courseId) {
        const [course] = await tx
          .select({ id: courses.id })
          .from(courses)
          .where(
            and(
              eq(courses.id, input.courseId),
              eq(courses.collegeId, input.collegeId),
              eq(courses.isActive, true),
            ),
          )
          .limit(1);
        if (!course)
          throw new AppError(
            422,
            "INVALID_COURSE",
            "Choose an active course in the selected college.",
          );
      }
      const result = await auth.api.signUpEmail({
        body: {
          name: [input.firstName, input.middleName, input.lastName]
            .filter(Boolean)
            .join(" "),
          email: input.email,
          password: input.password,
        },
      });
      authId = result.user.id;
      const [profile] = await tx
        .insert(users)
        .values({
          authUserId: authId,
          institutionalId: input.institutionalId,
          role: "student_faculty",
          personType: input.personType,
          firstName: input.firstName,
          middleName: input.middleName ?? null,
          lastName: input.lastName,
          email: input.email,
          collegeId: input.collegeId,
          courseId: input.courseId ?? null,
          accountStatus: "pending",
        })
        .returning({ id: users.id });
      await tx
        .insert(auditLogs)
        .values({
          action: "student_faculty_registered",
          entityType: "users",
          entityId: profile.id,
        });
      return { id: profile.id, accountStatus: "pending" as const };
    });
  } catch (error) {
    if (authId)
      await database()
        .delete(authUser)
        .where(eq(authUser.id, authId))
        .catch(() => undefined);
    throw error;
  }
}

export async function createAdmin(
  input: z.infer<typeof staffInput>,
  actorId: string,
) {
  let authId: string | undefined;
  try {
    return await database().transaction(async (tx) => {
      const [existingProfile] = await tx
        .select({ email: users.email, institutionalId: users.institutionalId })
        .from(users)
        .where(or(eq(users.email, input.email), eq(users.institutionalId, input.institutionalId)))
        .limit(1);
      if (existingProfile?.email.toLowerCase() === input.email)
        throw new AppError(409, "EMAIL_EXISTS", "That email address is already registered.");
      if (existingProfile?.institutionalId === input.institutionalId)
        throw new AppError(409, "INSTITUTIONAL_ID_EXISTS", "That institutional ID is already registered.");
      if (input.departmentId) {
        const [department] = await tx
          .select({ id: departments.id })
          .from(departments)
          .where(
            and(
              eq(departments.id, input.departmentId),
              eq(departments.isActive, true),
            ),
          )
          .limit(1);
        if (!department)
          throw new AppError(
            422,
            "INVALID_DEPARTMENT",
            "Choose an active department.",
          );
      }
      const result = await auth.api.signUpEmail({
        body: {
          name: [input.firstName, input.middleName, input.lastName]
            .filter(Boolean)
            .join(" "),
          email: input.email,
          password: input.password,
        },
      });
      authId = result.user.id;
      const [profile] = await tx
        .insert(users)
        .values({
          authUserId: authId,
          institutionalId: input.institutionalId,
          role: "admin",
          firstName: input.firstName,
          middleName: input.middleName ?? null,
          lastName: input.lastName,
          email: input.email,
          departmentId: input.departmentId ?? null,
          accountStatus: "active",
        })
        .returning({ id: users.id });
      await tx
        .insert(auditLogs)
        .values({
          actorUserId: actorId,
          action: "admin.created",
          entityType: "users",
          entityId: profile.id,
        });
      return { id: profile.id };
    });
  } catch (error) {
    if (authId)
      await database()
        .delete(authUser)
        .where(eq(authUser.id, authId))
        .catch(() => undefined);
    throw error;
  }
}
