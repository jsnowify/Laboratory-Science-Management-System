import { and, count, eq, ilike, or } from "drizzle-orm";
import type { z } from "zod";
import { courseInput, courseUpdate, departmentInput, departmentUpdate, organizationInput, organizationListQuery, organizationUpdate } from "@lsms/shared";
import { database } from "../../db";
import { auditLogs, colleges, courses, departments } from "../../db/introspected/schema";
import { AppError } from "../../lib/errors";

type ListInput = z.infer<typeof organizationListQuery>;
const whereText = (q: string, code: typeof colleges.code, name: typeof colleges.name) =>
  q ? or(ilike(code, `%${q}%`), ilike(name, `%${q}%`)) : undefined;

export async function listColleges(input: ListInput) {
  const filter = and(input.includeInactive ? undefined : eq(colleges.isActive, true), whereText(input.q, colleges.code, colleges.name));
  const [rows, totals] = await Promise.all([
    database().select().from(colleges).where(filter).orderBy(colleges.name).limit(input.limit).offset((input.page - 1) * input.limit),
    database().select({ total: count() }).from(colleges).where(filter),
  ]);
  return { data: rows, total: totals[0].total, page: input.page, limit: input.limit };
}

export async function createCollege(input: z.infer<typeof organizationInput>, actorId: string) {
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(colleges).values(input).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "college.created", entityType: "colleges", entityId: row.id });
    return row;
  });
}

export async function updateCollege(id: string, input: z.infer<typeof organizationUpdate>, actorId: string) {
  return database().transaction(async (tx) => {
    const [row] = await tx.update(colleges).set(input).where(eq(colleges.id, id)).returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "College not found.");
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: row.isActive ? "college.updated" : "college.deactivated", entityType: "colleges", entityId: id });
    return row;
  });
}

export async function listCourses(input: ListInput & { collegeId?: string }) {
  const filter = and(
    input.includeInactive ? undefined : eq(courses.isActive, true),
    input.collegeId ? eq(courses.collegeId, input.collegeId) : undefined,
    input.q ? or(ilike(courses.code, `%${input.q}%`), ilike(courses.name, `%${input.q}%`)) : undefined,
  );
  const [rows, totals] = await Promise.all([
    database().select().from(courses).where(filter).orderBy(courses.name).limit(input.limit).offset((input.page - 1) * input.limit),
    database().select({ total: count() }).from(courses).where(filter),
  ]);
  return { data: rows, total: totals[0].total, page: input.page, limit: input.limit };
}

async function requireActiveCollege(id: string) {
  const [college] = await database().select({ id: colleges.id }).from(colleges)
    .where(and(eq(colleges.id, id), eq(colleges.isActive, true))).limit(1);
  if (!college) throw new AppError(422, "INVALID_COLLEGE", "Choose an active college.");
}

export async function createCourse(input: z.infer<typeof courseInput>, actorId: string) {
  await requireActiveCollege(input.collegeId);
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(courses).values(input).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "course.created", entityType: "courses", entityId: row.id });
    return row;
  });
}

export async function updateCourse(id: string, input: z.infer<typeof courseUpdate>, actorId: string) {
  if (input.collegeId) await requireActiveCollege(input.collegeId);
  return database().transaction(async (tx) => {
    const [row] = await tx.update(courses).set(input).where(eq(courses.id, id)).returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "Course not found.");
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: row.isActive ? "course.updated" : "course.deactivated", entityType: "courses", entityId: id });
    return row;
  });
}

export async function listDepartments(input: ListInput) {
  const filter = and(input.includeInactive ? undefined : eq(departments.isActive, true),
    input.q ? or(ilike(departments.code, `%${input.q}%`), ilike(departments.name, `%${input.q}%`)) : undefined);
  const [rows, totals] = await Promise.all([
    database().select().from(departments).where(filter).orderBy(departments.name).limit(input.limit).offset((input.page - 1) * input.limit),
    database().select({ total: count() }).from(departments).where(filter),
  ]);
  return { data: rows, total: totals[0].total, page: input.page, limit: input.limit };
}

export async function createDepartment(input: z.infer<typeof departmentInput>, actorId: string) {
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(departments).values(input).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "department.created", entityType: "departments", entityId: row.id });
    return row;
  });
}

export async function updateDepartment(id: string, input: z.infer<typeof departmentUpdate>, actorId: string) {
  return database().transaction(async (tx) => {
    const [row] = await tx.update(departments).set(input).where(eq(departments.id, id)).returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "Department not found.");
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: row.isActive ? "department.updated" : "department.deactivated", entityType: "departments", entityId: id });
    return row;
  });
}
