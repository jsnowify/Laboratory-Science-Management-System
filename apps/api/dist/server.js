var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};

// src/app.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { fromNodeHeaders as fromNodeHeaders2 } from "better-auth/node";

// ../../packages/shared/src/permissions.ts
var permissions = {
  "organization.read": ["super_admin"],
  "users.create_admin": ["super_admin"],
  "organization.write": ["super_admin"],
  "borrowing.review": ["super_admin"],
  "borrowing.approve": ["super_admin"],
  "borrowing.reject": ["super_admin"],
  "borrowing.allocate": ["super_admin"],
  "custody.release": ["super_admin"],
  "custody.return": ["super_admin"],
  "iso.generate": ["super_admin"],
  "overdue.read": ["super_admin"],
  "accountability.read": ["super_admin"],
  "equipment.write": ["admin"],
  "users.manage": ["admin"],
  "qr.manage": ["admin"],
  "analytics.read": ["admin"],
  "reports.read": ["admin"],
  "equipment.read": ["student_faculty", "admin", "super_admin"],
  "borrow_request.create": ["student_faculty"],
  "borrow_request.read_own": ["student_faculty"],
  "borrow_request.cancel_own": ["student_faculty"],
  "history.read_own": ["student_faculty"],
  "accountability.read_own": ["student_faculty"]
};
function can(role, permission) {
  return permissions[permission].includes(role);
}

// ../../packages/shared/src/schemas.ts
import { z } from "zod";
var name = z.string().trim().min(1).max(100);
var email = z.email().max(255).transform((value) => value.toLowerCase());
var strongPassword = z.string().min(12, "Use at least 12 characters.").max(128).regex(/[A-Z]/, "Add an uppercase letter.").regex(/[a-z]/, "Add a lowercase letter.").regex(/[0-9]/, "Add a number.").regex(/[^A-Za-z0-9]/, "Add a special character.");
var identityInput = z.object({
  institutionalId: z.string().trim().min(2).max(50),
  firstName: name,
  middleName: z.string().trim().max(100).optional(),
  lastName: name,
  email,
  password: strongPassword
});
var setupInput = identityInput.extend({
  password: z.string().min(10).max(128),
  setupToken: z.string().min(1)
});
var staffInput = identityInput.extend({ departmentId: z.uuid().optional() });
var registrationInput = identityInput.extend({
  personType: z.enum(["student", "faculty"]),
  collegeId: z.uuid(),
  courseId: z.uuid().optional()
}).refine((value) => value.personType !== "student" || Boolean(value.courseId), {
  path: ["courseId"],
  message: "A course is required for students."
});
var organizationInput = z.object({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(150)
});
var departmentInput = organizationInput.extend({ code: z.string().trim().max(30).optional() });
var courseInput = organizationInput.extend({ collegeId: z.uuid() });
var uuidParam = z.object({ id: z.uuid() });
var listQuery = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
var organizationListQuery = listQuery.extend({
  includeInactive: z.enum(["true", "false"]).optional().transform((value) => value === "true")
});
var organizationUpdate = organizationInput.partial().extend({ isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "Provide at least one field.");
var courseUpdate = courseInput.partial().extend({ isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "Provide at least one field.");
var departmentUpdate = departmentInput.partial().extend({ isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "Provide at least one field.");
var userListQuery = listQuery.extend({
  status: z.enum(["pending", "active", "suspended", "archived"]).optional()
});
var userStatusInput = z.object({ status: z.enum(["active", "suspended", "archived"]) });
var categoryInput = z.object({ name: z.string().trim().min(1).max(100), description: z.string().trim().max(2e3).optional() });
var categoryUpdate = categoryInput.partial().extend({ isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
var catalogInput = z.object({
  categoryId: z.uuid(),
  equipmentName: z.string().trim().min(1).max(150),
  description: z.string().trim().max(4e3).optional(),
  manufacturer: z.string().trim().max(150).optional(),
  model: z.string().trim().max(150).optional(),
  unitOfMeasure: z.string().trim().min(1).max(50).default("unit")
});
var catalogUpdate = catalogInput.partial().extend({ isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
var assetInput = z.object({
  equipmentCatalogId: z.uuid(),
  assetCode: z.string().trim().min(1).max(50),
  serialNumber: z.string().trim().max(100).optional(),
  departmentId: z.uuid().optional(),
  currentCondition: z.enum(["excellent", "good", "fair", "damaged"]).default("good"),
  operationalStatus: z.enum(["active", "maintenance", "damaged", "retired"]).default("active"),
  acquisitionDate: z.iso.date().optional(),
  notes: z.string().trim().max(4e3).optional()
});
var assetUpdate = assetInput.partial().extend({ archive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
var equipmentListQuery = listQuery.extend({
  categoryId: z.uuid().optional(),
  catalogId: z.uuid().optional(),
  includeInactive: z.enum(["true", "false"]).optional().transform((value) => value === "true")
});
var scheduledAt = z.iso.datetime({ offset: true });
var borrowRequestInput = z.object({
  purpose: z.string().trim().min(5).max(4e3),
  requestedBorrowAt: scheduledAt,
  requestedDueAt: scheduledAt,
  items: z.array(z.object({ equipmentCatalogId: z.uuid(), quantityRequested: z.number().int().min(1).max(100) })).min(1).max(20)
}).refine((value) => Date.parse(value.requestedDueAt) > Date.parse(value.requestedBorrowAt), { path: ["requestedDueAt"], message: "Due date must be after the borrow date." }).refine((value) => new Set(value.items.map((item) => item.equipmentCatalogId)).size === value.items.length, { path: ["items"], message: "Each equipment type can appear once." });
var rejectionInput = z.object({ reason: z.string().trim().min(5).max(2e3), notes: z.string().trim().max(2e3).optional() });
var reviewInput = z.object({ notes: z.string().trim().max(2e3).optional() });
var approvalInput = z.object({
  items: z.array(z.object({ itemId: z.uuid(), quantityApproved: z.number().int().min(0) })).min(1),
  notes: z.string().trim().max(2e3).optional()
}).refine((value) => value.items.some((item) => item.quantityApproved > 0), { path: ["items"], message: "Approve at least one unit." });
var allocationInput = z.object({ itemId: z.uuid(), assetId: z.uuid() });
var releaseInput = z.object({
  allocations: z.array(z.object({ allocationId: z.uuid(), condition: z.enum(["excellent", "good", "fair", "damaged"]), notes: z.string().trim().max(2e3).optional() })).min(1)
}).refine((value) => new Set(value.allocations.map((item) => item.allocationId)).size === value.allocations.length, { path: ["allocations"], message: "Each allocation can appear once." });
var returnInput = z.object({
  allocationId: z.uuid(),
  conditionAfter: z.enum(["excellent", "good", "fair", "damaged"]),
  outcome: z.enum(["normal", "damaged", "maintenance_required"]),
  remarks: z.string().trim().max(2e3).optional()
}).refine((value) => value.outcome === "normal" || Boolean(value.remarks), { path: ["remarks"], message: "Add remarks for damage or maintenance." }).refine((value) => value.conditionAfter !== "damaged" || value.outcome === "damaged", { path: ["outcome"], message: "A damaged condition requires a damaged outcome." });
var borrowListQuery = listQuery.extend({ status: z.enum(["draft", "submitted", "under_review", "approved", "rejected", "ready_for_release", "borrowed", "partially_returned", "returned", "cancelled"]).optional() });

// src/auth/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";

// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// src/lib/env.ts
import { z as z2 } from "zod";
import { config } from "dotenv";
config({ path: process.env.LSMS_ENV_FILE ?? "../../.env.local", quiet: true });
var serverSchema = z2.object({
  DATABASE_URL: z2.url().refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), "Use a PostgreSQL URL"),
  BETTER_AUTH_SECRET: z2.string().min(32),
  BETTER_AUTH_URL: z2.url(),
  FRONTEND_URL: z2.url(),
  INITIAL_SETUP_TOKEN: z2.string().min(24),
  PORT: z2.coerce.number().int().min(1).max(65535).default(4e3),
  NODE_ENV: z2.enum(["development", "production", "test"]).default("development")
});
function serverEnv() {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid server configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }
  return result.data;
}

// src/db/introspected/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accountStatus: () => accountStatus,
  allocationStatus: () => allocationStatus,
  auditLogs: () => auditLogs,
  borrowAllocations: () => borrowAllocations,
  borrowRequestItems: () => borrowRequestItems,
  borrowRequestNumberSeq: () => borrowRequestNumberSeq,
  borrowRequestStatus: () => borrowRequestStatus,
  borrowRequestStatusHistory: () => borrowRequestStatusHistory,
  borrowRequests: () => borrowRequests,
  colleges: () => colleges,
  courses: () => courses,
  departments: () => departments,
  equipmentAssets: () => equipmentAssets,
  equipmentCatalog: () => equipmentCatalog,
  equipmentCategories: () => equipmentCategories,
  equipmentCondition: () => equipmentCondition,
  equipmentOperationalStatus: () => equipmentOperationalStatus,
  isoRequisitionNumberSeq: () => isoRequisitionNumberSeq,
  isoRequisitions: () => isoRequisitions,
  notifications: () => notifications,
  personType: () => personType,
  returnOutcome: () => returnOutcome,
  returnRecords: () => returnRecords,
  userRole: () => userRole,
  users: () => users,
  vwAccountabilityRecords: () => vwAccountabilityRecords,
  vwBorrowingTrendsMonthly: () => vwBorrowingTrendsMonthly,
  vwCollegeBorrowingFrequency: () => vwCollegeBorrowingFrequency,
  vwCourseBorrowingFrequency: () => vwCourseBorrowingFrequency,
  vwCurrentCustody: () => vwCurrentCustody,
  vwEquipmentAssetAvailability: () => vwEquipmentAssetAvailability,
  vwEquipmentInventorySummary: () => vwEquipmentInventorySummary,
  vwEquipmentQrLookup: () => vwEquipmentQrLookup,
  vwEquipmentUsage: () => vwEquipmentUsage,
  vwInventoryUtilization: () => vwInventoryUtilization,
  vwOverdueLoans: () => vwOverdueLoans,
  vwPeakBorrowingPeriods: () => vwPeakBorrowingPeriods,
  vwUserBorrowingFrequency: () => vwUserBorrowingFrequency
});
import { pgTable, unique, uuid, varchar, boolean, timestamp, index, foreignKey, check, text, date, integer, jsonb, inet, pgView, bigint, interval, numeric, pgSequence, pgEnum, customType } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
var citext = customType({ dataType: () => "citext" });
var tstzrange = customType({ dataType: () => "tstzrange" });
var accountStatus = pgEnum("account_status", ["pending", "active", "suspended", "archived"]);
var allocationStatus = pgEnum("allocation_status", ["reserved", "released", "returned", "cancelled"]);
var borrowRequestStatus = pgEnum("borrow_request_status", ["draft", "submitted", "under_review", "approved", "rejected", "ready_for_release", "borrowed", "partially_returned", "returned", "cancelled"]);
var equipmentCondition = pgEnum("equipment_condition", ["excellent", "good", "fair", "damaged"]);
var equipmentOperationalStatus = pgEnum("equipment_operational_status", ["active", "maintenance", "damaged", "retired"]);
var personType = pgEnum("person_type", ["student", "faculty"]);
var returnOutcome = pgEnum("return_outcome", ["normal", "damaged", "maintenance_required"]);
var userRole = pgEnum("user_role", ["super_admin", "admin", "student_faculty"]);
var borrowRequestNumberSeq = pgSequence("borrow_request_number_seq", { startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false });
var isoRequisitionNumberSeq = pgSequence("iso_requisition_number_seq", { startWith: "1", increment: "1", minValue: "1", maxValue: "9223372036854775807", cache: "1", cycle: false });
var colleges = pgTable("colleges", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  code: varchar({ length: 30 }).notNull(),
  name: varchar({ length: 150 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  unique("colleges_code_key").on(table.code),
  unique("colleges_name_key").on(table.name)
]);
var courses = pgTable("courses", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  collegeId: uuid("college_id").notNull(),
  code: varchar({ length: 30 }).notNull(),
  name: varchar({ length: 150 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_courses_college").using("btree", table.collegeId.asc().nullsLast().op("uuid_ops")),
  foreignKey({
    columns: [table.collegeId],
    foreignColumns: [colleges.id],
    name: "courses_college_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  unique("uq_course_code_per_college").on(table.collegeId, table.code),
  unique("uq_course_name_per_college").on(table.name, table.collegeId)
]);
var users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  authUserId: text("auth_user_id"),
  institutionalId: varchar("institutional_id", { length: 50 }).notNull(),
  role: userRole().notNull(),
  personType: personType("person_type"),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  middleName: varchar("middle_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: citext("email").notNull(),
  collegeId: uuid("college_id"),
  courseId: uuid("course_id"),
  departmentId: uuid("department_id"),
  accountStatus: accountStatus("account_status").default("pending").notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_users_account_status").using("btree", table.accountStatus.asc().nullsLast().op("enum_ops")),
  index("idx_users_college").using("btree", table.collegeId.asc().nullsLast().op("uuid_ops")),
  index("idx_users_course").using("btree", table.courseId.asc().nullsLast().op("uuid_ops")),
  index("idx_users_department").using("btree", table.departmentId.asc().nullsLast().op("uuid_ops")),
  index("idx_users_role").using("btree", table.role.asc().nullsLast().op("enum_ops")),
  foreignKey({
    columns: [table.collegeId],
    foreignColumns: [colleges.id],
    name: "users_college_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.courseId],
    foreignColumns: [courses.id],
    name: "users_course_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.departmentId],
    foreignColumns: [departments.id],
    name: "users_department_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  unique("users_auth_user_id_key").on(table.authUserId),
  unique("users_institutional_id_key").on(table.institutionalId),
  unique("users_email_key").on(table.email),
  check("chk_person_type_by_role", sql`((role = 'student_faculty'::user_role) AND (person_type IS NOT NULL)) OR ((role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])) AND (person_type IS NULL))`)
]);
var departments = pgTable("departments", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  code: varchar({ length: 30 }),
  name: varchar({ length: 150 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  unique("departments_code_key").on(table.code),
  unique("departments_name_key").on(table.name)
]);
var equipmentCategories = pgTable("equipment_categories", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: varchar({ length: 100 }).notNull(),
  description: text(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  unique("equipment_categories_name_key").on(table.name)
]);
var equipmentCatalog = pgTable("equipment_catalog", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  categoryId: uuid("category_id").notNull(),
  equipmentName: varchar("equipment_name", { length: 150 }).notNull(),
  description: text(),
  manufacturer: varchar({ length: 150 }),
  model: varchar({ length: 150 }),
  unitOfMeasure: varchar("unit_of_measure", { length: 50 }).default("unit").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_equipment_catalog_category").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
  index("idx_equipment_catalog_name").using("btree", table.equipmentName.asc().nullsLast().op("text_ops")),
  foreignKey({
    columns: [table.categoryId],
    foreignColumns: [equipmentCategories.id],
    name: "equipment_catalog_category_id_fkey"
  }).onUpdate("cascade").onDelete("restrict")
]);
var equipmentAssets = pgTable("equipment_assets", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  equipmentCatalogId: uuid("equipment_catalog_id").notNull(),
  assetCode: varchar("asset_code", { length: 50 }).notNull(),
  qrToken: uuid("qr_token").defaultRandom().notNull(),
  serialNumber: varchar("serial_number", { length: 100 }),
  departmentId: uuid("department_id"),
  currentCondition: equipmentCondition("current_condition").default("good").notNull(),
  operationalStatus: equipmentOperationalStatus("operational_status").default("active").notNull(),
  acquisitionDate: date("acquisition_date"),
  notes: text(),
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_equipment_assets_catalog").using("btree", table.equipmentCatalogId.asc().nullsLast().op("uuid_ops")),
  index("idx_equipment_assets_condition").using("btree", table.currentCondition.asc().nullsLast().op("enum_ops")),
  index("idx_equipment_assets_department").using("btree", table.departmentId.asc().nullsLast().op("uuid_ops")),
  index("idx_equipment_assets_status").using("btree", table.operationalStatus.asc().nullsLast().op("enum_ops")),
  foreignKey({
    columns: [table.equipmentCatalogId],
    foreignColumns: [equipmentCatalog.id],
    name: "equipment_assets_equipment_catalog_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.departmentId],
    foreignColumns: [departments.id],
    name: "equipment_assets_department_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  unique("equipment_assets_asset_code_key").on(table.assetCode),
  unique("equipment_assets_qr_token_key").on(table.qrToken),
  unique("equipment_assets_serial_number_key").on(table.serialNumber)
]);
var borrowRequests = pgTable("borrow_requests", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  requestNumber: varchar("request_number", { length: 30 }).default(sql`generate_borrow_request_number()`).notNull(),
  borrowerId: uuid("borrower_id").notNull(),
  purpose: text().notNull(),
  requestedBorrowAt: timestamp("requested_borrow_at", { withTimezone: true, mode: "string" }).notNull(),
  requestedDueAt: timestamp("requested_due_at", { withTimezone: true, mode: "string" }).notNull(),
  status: borrowRequestStatus().default("draft").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "string" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "string" }),
  reviewedBy: uuid("reviewed_by"),
  reviewNotes: text("review_notes"),
  rejectionReason: text("rejection_reason"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_borrow_requests_borrower").using("btree", table.borrowerId.asc().nullsLast().op("uuid_ops")),
  index("idx_borrow_requests_schedule").using("btree", table.requestedBorrowAt.asc().nullsLast().op("timestamptz_ops"), table.requestedDueAt.asc().nullsLast().op("timestamptz_ops")),
  index("idx_borrow_requests_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
  index("idx_borrow_requests_submitted").using("btree", table.submittedAt.asc().nullsLast().op("timestamptz_ops")),
  foreignKey({
    columns: [table.borrowerId],
    foreignColumns: [users.id],
    name: "borrow_requests_borrower_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.reviewedBy],
    foreignColumns: [users.id],
    name: "borrow_requests_reviewed_by_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  unique("borrow_requests_request_number_key").on(table.requestNumber),
  check("chk_valid_borrow_period", sql`requested_due_at > requested_borrow_at`)
]);
var borrowRequestItems = pgTable("borrow_request_items", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  borrowRequestId: uuid("borrow_request_id").notNull(),
  equipmentCatalogId: uuid("equipment_catalog_id").notNull(),
  quantityRequested: integer("quantity_requested").notNull(),
  quantityApproved: integer("quantity_approved"),
  remarks: text(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_borrow_request_items_catalog").using("btree", table.equipmentCatalogId.asc().nullsLast().op("uuid_ops")),
  index("idx_borrow_request_items_request").using("btree", table.borrowRequestId.asc().nullsLast().op("uuid_ops")),
  foreignKey({
    columns: [table.borrowRequestId],
    foreignColumns: [borrowRequests.id],
    name: "borrow_request_items_borrow_request_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.equipmentCatalogId],
    foreignColumns: [equipmentCatalog.id],
    name: "borrow_request_items_equipment_catalog_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  unique("uq_request_equipment_type").on(table.equipmentCatalogId, table.borrowRequestId),
  check("chk_requested_quantity_positive", sql`quantity_requested > 0`),
  check("chk_approved_quantity", sql`(quantity_approved IS NULL) OR ((quantity_approved >= 0) AND (quantity_approved <= quantity_requested))`)
]);
var borrowAllocations = pgTable("borrow_allocations", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  borrowRequestItemId: uuid("borrow_request_item_id").notNull(),
  equipmentAssetId: uuid("equipment_asset_id").notNull(),
  reservationPeriod: tstzrange("reservation_period").notNull(),
  allocationStatus: allocationStatus("allocation_status").default("reserved").notNull(),
  allocatedBy: uuid("allocated_by").notNull(),
  allocatedAt: timestamp("allocated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  releasedBy: uuid("released_by"),
  releasedAt: timestamp("released_at", { withTimezone: true, mode: "string" }),
  releaseCondition: equipmentCondition("release_condition"),
  releaseNotes: text("release_notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_borrow_allocations_asset").using("btree", table.equipmentAssetId.asc().nullsLast().op("uuid_ops")),
  index("idx_borrow_allocations_request_item").using("btree", table.borrowRequestItemId.asc().nullsLast().op("uuid_ops")),
  index("idx_borrow_allocations_status").using("btree", table.allocationStatus.asc().nullsLast().op("enum_ops")),
  foreignKey({
    columns: [table.borrowRequestItemId],
    foreignColumns: [borrowRequestItems.id],
    name: "borrow_allocations_borrow_request_item_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.equipmentAssetId],
    foreignColumns: [equipmentAssets.id],
    name: "borrow_allocations_equipment_asset_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.allocatedBy],
    foreignColumns: [users.id],
    name: "borrow_allocations_allocated_by_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.releasedBy],
    foreignColumns: [users.id],
    name: "borrow_allocations_released_by_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  unique("uq_request_item_asset").on(table.equipmentAssetId, table.borrowRequestItemId),
  check("chk_reservation_period", sql`lower(reservation_period) < upper(reservation_period)`),
  check("chk_release_information", sql`(allocation_status = ANY (ARRAY['reserved'::allocation_status, 'cancelled'::allocation_status])) OR ((released_by IS NOT NULL) AND (released_at IS NOT NULL) AND (release_condition IS NOT NULL))`)
]);
var returnRecords = pgTable("return_records", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  allocationId: uuid("allocation_id").notNull(),
  processedBy: uuid("processed_by").notNull(),
  returnedAt: timestamp("returned_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  conditionAfter: equipmentCondition("condition_after").notNull(),
  outcome: returnOutcome().default("normal").notNull(),
  remarks: text(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_return_records_returned_at").using("btree", table.returnedAt.asc().nullsLast().op("timestamptz_ops")),
  foreignKey({
    columns: [table.allocationId],
    foreignColumns: [borrowAllocations.id],
    name: "return_records_allocation_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.processedBy],
    foreignColumns: [users.id],
    name: "return_records_processed_by_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  unique("return_records_allocation_id_key").on(table.allocationId)
]);
var isoRequisitions = pgTable("iso_requisitions", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  borrowRequestId: uuid("borrow_request_id").notNull(),
  formNumber: varchar("form_number", { length: 60 }).default(sql`generate_iso_requisition_number()`).notNull(),
  generatedBy: uuid("generated_by").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true, mode: "string" }),
  storageBucket: varchar("storage_bucket", { length: 100 }),
  storagePath: text("storage_path"),
  documentHash: varchar("document_hash", { length: 128 }),
  version: integer().default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_iso_generated_at").using("btree", table.generatedAt.asc().nullsLast().op("timestamptz_ops")),
  foreignKey({
    columns: [table.borrowRequestId],
    foreignColumns: [borrowRequests.id],
    name: "iso_requisitions_borrow_request_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.generatedBy],
    foreignColumns: [users.id],
    name: "iso_requisitions_generated_by_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  unique("iso_requisitions_borrow_request_id_key").on(table.borrowRequestId),
  unique("iso_requisitions_form_number_key").on(table.formNumber),
  check("chk_iso_version", sql`version > 0`)
]);
var borrowRequestStatusHistory = pgTable("borrow_request_status_history", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  borrowRequestId: uuid("borrow_request_id").notNull(),
  previousStatus: borrowRequestStatus("previous_status"),
  newStatus: borrowRequestStatus("new_status").notNull(),
  changedBy: uuid("changed_by"),
  remarks: text(),
  changedAt: timestamp("changed_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_status_history_request_date").using("btree", table.borrowRequestId.asc().nullsLast().op("timestamptz_ops"), table.changedAt.desc().nullsFirst().op("timestamptz_ops")),
  foreignKey({
    columns: [table.borrowRequestId],
    foreignColumns: [borrowRequests.id],
    name: "borrow_request_status_history_borrow_request_id_fkey"
  }).onUpdate("cascade").onDelete("restrict"),
  foreignKey({
    columns: [table.changedBy],
    foreignColumns: [users.id],
    name: "borrow_request_status_history_changed_by_fkey"
  }).onUpdate("cascade").onDelete("restrict")
]);
var notifications = pgTable("notifications", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  userId: uuid("user_id").notNull(),
  notificationType: varchar("notification_type", { length: 60 }).notNull(),
  title: varchar({ length: 150 }).notNull(),
  message: text().notNull(),
  relatedEntityType: varchar("related_entity_type", { length: 60 }),
  relatedEntityId: uuid("related_entity_id"),
  readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_notifications_unread").using("btree", table.userId.asc().nullsLast().op("uuid_ops")).where(sql`(read_at IS NULL)`),
  index("idx_notifications_user_created").using("btree", table.userId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "notifications_user_id_fkey"
  }).onUpdate("cascade").onDelete("restrict")
]);
var auditLogs = pgTable("audit_logs", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  actorUserId: uuid("actor_user_id"),
  action: varchar({ length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: uuid("entity_id"),
  metadata: jsonb(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull()
}, (table) => [
  index("idx_audit_actor_date").using("btree", table.actorUserId.asc().nullsLast().op("timestamptz_ops"), table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
  index("idx_audit_entity").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
  foreignKey({
    columns: [table.actorUserId],
    foreignColumns: [users.id],
    name: "audit_logs_actor_user_id_fkey"
  }).onUpdate("cascade").onDelete("restrict")
]);
var vwEquipmentAssetAvailability = pgView("vw_equipment_asset_availability", {
  equipmentAssetId: uuid("equipment_asset_id"),
  assetCode: varchar("asset_code", { length: 50 }),
  qrToken: uuid("qr_token"),
  serialNumber: varchar("serial_number", { length: 100 }),
  equipmentCatalogId: uuid("equipment_catalog_id"),
  equipmentName: varchar("equipment_name", { length: 150 }),
  categoryId: uuid("category_id"),
  categoryName: varchar("category_name", { length: 100 }),
  currentCondition: equipmentCondition("current_condition"),
  operationalStatus: equipmentOperationalStatus("operational_status"),
  availabilityStatus: text("availability_status")
}).as(sql`SELECT ea.id AS equipment_asset_id, ea.asset_code, ea.qr_token, ea.serial_number, ec.id AS equipment_catalog_id, ec.equipment_name, category.id AS category_id, category.name AS category_name, ea.current_condition, ea.operational_status, CASE WHEN ea.archived_at IS NOT NULL THEN 'archived'::text WHEN ea.operational_status = 'maintenance'::equipment_operational_status THEN 'maintenance'::text WHEN ea.operational_status = 'damaged'::equipment_operational_status THEN 'damaged'::text WHEN ea.operational_status = 'retired'::equipment_operational_status THEN 'retired'::text WHEN (EXISTS ( SELECT 1 FROM borrow_allocations ba WHERE ba.equipment_asset_id = ea.id AND ba.allocation_status = 'released'::allocation_status)) THEN 'borrowed'::text WHEN (EXISTS ( SELECT 1 FROM borrow_allocations ba WHERE ba.equipment_asset_id = ea.id AND ba.allocation_status = 'reserved'::allocation_status AND ba.reservation_period @> now())) THEN 'reserved'::text ELSE 'available'::text END AS availability_status FROM equipment_assets ea JOIN equipment_catalog ec ON ec.id = ea.equipment_catalog_id JOIN equipment_categories category ON category.id = ec.category_id`);
var vwEquipmentInventorySummary = pgView("vw_equipment_inventory_summary", {
  equipmentCatalogId: uuid("equipment_catalog_id"),
  equipmentName: varchar("equipment_name", { length: 150 }),
  categoryId: uuid("category_id"),
  categoryName: varchar("category_name", { length: 100 }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalUnits: bigint("total_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  availableUnits: bigint("available_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  reservedUnits: bigint("reserved_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  borrowedUnits: bigint("borrowed_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  maintenanceUnits: bigint("maintenance_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  damagedUnits: bigint("damaged_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  retiredUnits: bigint("retired_units", { mode: "number" })
}).as(sql`SELECT equipment_catalog_id, equipment_name, category_id, category_name, count(*) FILTER (WHERE availability_status <> 'archived'::text) AS total_units, count(*) FILTER (WHERE availability_status = 'available'::text) AS available_units, count(*) FILTER (WHERE availability_status = 'reserved'::text) AS reserved_units, count(*) FILTER (WHERE availability_status = 'borrowed'::text) AS borrowed_units, count(*) FILTER (WHERE availability_status = 'maintenance'::text) AS maintenance_units, count(*) FILTER (WHERE availability_status = 'damaged'::text) AS damaged_units, count(*) FILTER (WHERE availability_status = 'retired'::text) AS retired_units FROM vw_equipment_asset_availability GROUP BY equipment_catalog_id, equipment_name, category_id, category_name`);
var vwCurrentCustody = pgView("vw_current_custody", {
  allocationId: uuid("allocation_id"),
  borrowRequestId: uuid("borrow_request_id"),
  requestNumber: varchar("request_number", { length: 30 }),
  borrowerId: uuid("borrower_id"),
  institutionalId: varchar("institutional_id", { length: 50 }),
  borrowerName: text("borrower_name"),
  equipmentAssetId: uuid("equipment_asset_id"),
  assetCode: varchar("asset_code", { length: 50 }),
  equipmentCatalogId: uuid("equipment_catalog_id"),
  equipmentName: varchar("equipment_name", { length: 150 }),
  releasedAt: timestamp("released_at", { withTimezone: true, mode: "string" }),
  dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }),
  releaseCondition: equipmentCondition("release_condition"),
  isOverdue: boolean("is_overdue")
}).as(sql`SELECT ba.id AS allocation_id, br.id AS borrow_request_id, br.request_number, u.id AS borrower_id, u.institutional_id, concat_ws(' '::text, u.first_name, u.middle_name, u.last_name) AS borrower_name, ea.id AS equipment_asset_id, ea.asset_code, ec.id AS equipment_catalog_id, ec.equipment_name, ba.released_at, br.requested_due_at AS due_at, ba.release_condition, br.requested_due_at < now() AS is_overdue FROM borrow_allocations ba JOIN borrow_request_items bri ON bri.id = ba.borrow_request_item_id JOIN borrow_requests br ON br.id = bri.borrow_request_id JOIN users u ON u.id = br.borrower_id JOIN equipment_assets ea ON ea.id = ba.equipment_asset_id JOIN equipment_catalog ec ON ec.id = ea.equipment_catalog_id WHERE ba.allocation_status = 'released'::allocation_status`);
var vwOverdueLoans = pgView("vw_overdue_loans", {
  allocationId: uuid("allocation_id"),
  borrowRequestId: uuid("borrow_request_id"),
  requestNumber: varchar("request_number", { length: 30 }),
  borrowerId: uuid("borrower_id"),
  institutionalId: varchar("institutional_id", { length: 50 }),
  borrowerName: text("borrower_name"),
  equipmentAssetId: uuid("equipment_asset_id"),
  assetCode: varchar("asset_code", { length: 50 }),
  equipmentCatalogId: uuid("equipment_catalog_id"),
  equipmentName: varchar("equipment_name", { length: 150 }),
  releasedAt: timestamp("released_at", { withTimezone: true, mode: "string" }),
  dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }),
  overdueDuration: interval("overdue_duration"),
  releaseCondition: equipmentCondition("release_condition")
}).as(sql`SELECT allocation_id, borrow_request_id, request_number, borrower_id, institutional_id, borrower_name, equipment_asset_id, asset_code, equipment_catalog_id, equipment_name, released_at, due_at, now() - due_at AS overdue_duration, release_condition FROM vw_current_custody WHERE due_at < now()`);
var vwAccountabilityRecords = pgView("vw_accountability_records", {
  returnRecordId: uuid("return_record_id"),
  borrowRequestId: uuid("borrow_request_id"),
  requestNumber: varchar("request_number", { length: 30 }),
  borrowerId: uuid("borrower_id"),
  institutionalId: varchar("institutional_id", { length: 50 }),
  borrowerName: text("borrower_name"),
  equipmentAssetId: uuid("equipment_asset_id"),
  assetCode: varchar("asset_code", { length: 50 }),
  equipmentName: varchar("equipment_name", { length: 150 }),
  conditionBefore: equipmentCondition("condition_before"),
  conditionAfter: equipmentCondition("condition_after"),
  outcome: returnOutcome(),
  releasedAt: timestamp("released_at", { withTimezone: true, mode: "string" }),
  dueAt: timestamp("due_at", { withTimezone: true, mode: "string" }),
  returnedAt: timestamp("returned_at", { withTimezone: true, mode: "string" }),
  wasReturnedLate: boolean("was_returned_late"),
  remarks: text(),
  processedBy: uuid("processed_by")
}).as(sql`SELECT rr.id AS return_record_id, br.id AS borrow_request_id, br.request_number, u.id AS borrower_id, u.institutional_id, concat_ws(' '::text, u.first_name, u.middle_name, u.last_name) AS borrower_name, ea.id AS equipment_asset_id, ea.asset_code, ec.equipment_name, ba.release_condition AS condition_before, rr.condition_after, rr.outcome, ba.released_at, br.requested_due_at AS due_at, rr.returned_at, rr.returned_at > br.requested_due_at AS was_returned_late, rr.remarks, rr.processed_by FROM return_records rr JOIN borrow_allocations ba ON ba.id = rr.allocation_id JOIN borrow_request_items bri ON bri.id = ba.borrow_request_item_id JOIN borrow_requests br ON br.id = bri.borrow_request_id JOIN users u ON u.id = br.borrower_id JOIN equipment_assets ea ON ea.id = ba.equipment_asset_id JOIN equipment_catalog ec ON ec.id = ea.equipment_catalog_id`);
var vwBorrowingTrendsMonthly = pgView("vw_borrowing_trends_monthly", {
  month: timestamp({ withTimezone: true, mode: "string" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalRequests: bigint("total_requests", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  rejectedRequests: bigint("rejected_requests", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  cancelledRequests: bigint("cancelled_requests", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  acceptedRequests: bigint("accepted_requests", { mode: "number" })
}).as(sql`SELECT date_trunc('month'::text, submitted_at) AS month, count(*) AS total_requests, count(*) FILTER (WHERE status = 'rejected'::borrow_request_status) AS rejected_requests, count(*) FILTER (WHERE status = 'cancelled'::borrow_request_status) AS cancelled_requests, count(*) FILTER (WHERE status = ANY (ARRAY['approved'::borrow_request_status, 'ready_for_release'::borrow_request_status, 'borrowed'::borrow_request_status, 'partially_returned'::borrow_request_status, 'returned'::borrow_request_status])) AS accepted_requests FROM borrow_requests WHERE submitted_at IS NOT NULL GROUP BY (date_trunc('month'::text, submitted_at))`);
var vwEquipmentUsage = pgView("vw_equipment_usage", {
  equipmentCatalogId: uuid("equipment_catalog_id"),
  equipmentName: varchar("equipment_name", { length: 150 }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalBorrowCount: bigint("total_borrow_count", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  uniqueAssetsUsed: bigint("unique_assets_used", { mode: "number" }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "string" })
}).as(sql`SELECT ec.id AS equipment_catalog_id, ec.equipment_name, count(ba.id) FILTER (WHERE ba.released_at IS NOT NULL) AS total_borrow_count, count(DISTINCT ba.equipment_asset_id) FILTER (WHERE ba.released_at IS NOT NULL) AS unique_assets_used, max(ba.released_at) AS last_used_at FROM equipment_catalog ec LEFT JOIN equipment_assets ea ON ea.equipment_catalog_id = ec.id LEFT JOIN borrow_allocations ba ON ba.equipment_asset_id = ea.id GROUP BY ec.id, ec.equipment_name`);
var vwInventoryUtilization = pgView("vw_inventory_utilization", {
  equipmentCatalogId: uuid("equipment_catalog_id"),
  equipmentName: varchar("equipment_name", { length: 150 }),
  categoryName: varchar("category_name", { length: 100 }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalUnits: bigint("total_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  availableUnits: bigint("available_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  reservedUnits: bigint("reserved_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  borrowedUnits: bigint("borrowed_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  maintenanceUnits: bigint("maintenance_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  damagedUnits: bigint("damaged_units", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  retiredUnits: bigint("retired_units", { mode: "number" }),
  currentUtilizationPercent: numeric("current_utilization_percent")
}).as(sql`SELECT equipment_catalog_id, equipment_name, category_name, total_units, available_units, reserved_units, borrowed_units, maintenance_units, damaged_units, retired_units, round(borrowed_units::numeric / NULLIF(total_units - maintenance_units - damaged_units - retired_units, 0)::numeric * 100::numeric, 2) AS current_utilization_percent FROM vw_equipment_inventory_summary`);
var vwUserBorrowingFrequency = pgView("vw_user_borrowing_frequency", {
  userId: uuid("user_id"),
  institutionalId: varchar("institutional_id", { length: 50 }),
  userName: text("user_name"),
  personType: personType("person_type"),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalRequests: bigint("total_requests", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalAssetsBorrowed: bigint("total_assets_borrowed", { mode: "number" })
}).as(sql`SELECT u.id AS user_id, u.institutional_id, concat_ws(' '::text, u.first_name, u.middle_name, u.last_name) AS user_name, u.person_type, count(DISTINCT br.id) FILTER (WHERE br.submitted_at IS NOT NULL) AS total_requests, count(ba.id) FILTER (WHERE ba.released_at IS NOT NULL) AS total_assets_borrowed FROM users u LEFT JOIN borrow_requests br ON br.borrower_id = u.id LEFT JOIN borrow_request_items bri ON bri.borrow_request_id = br.id LEFT JOIN borrow_allocations ba ON ba.borrow_request_item_id = bri.id WHERE u.role = 'student_faculty'::user_role GROUP BY u.id, u.institutional_id, u.first_name, u.middle_name, u.last_name, u.person_type`);
var vwCollegeBorrowingFrequency = pgView("vw_college_borrowing_frequency", {
  collegeId: uuid("college_id"),
  collegeCode: varchar("college_code", { length: 30 }),
  collegeName: varchar("college_name", { length: 150 }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalRequests: bigint("total_requests", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalAssetsBorrowed: bigint("total_assets_borrowed", { mode: "number" })
}).as(sql`SELECT college.id AS college_id, college.code AS college_code, college.name AS college_name, count(DISTINCT br.id) FILTER (WHERE br.submitted_at IS NOT NULL) AS total_requests, count(ba.id) FILTER (WHERE ba.released_at IS NOT NULL) AS total_assets_borrowed FROM colleges college LEFT JOIN users u ON u.college_id = college.id LEFT JOIN borrow_requests br ON br.borrower_id = u.id LEFT JOIN borrow_request_items bri ON bri.borrow_request_id = br.id LEFT JOIN borrow_allocations ba ON ba.borrow_request_item_id = bri.id GROUP BY college.id, college.code, college.name`);
var vwCourseBorrowingFrequency = pgView("vw_course_borrowing_frequency", {
  courseId: uuid("course_id"),
  courseCode: varchar("course_code", { length: 30 }),
  courseName: varchar("course_name", { length: 150 }),
  collegeId: uuid("college_id"),
  collegeName: varchar("college_name", { length: 150 }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalRequests: bigint("total_requests", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalAssetsBorrowed: bigint("total_assets_borrowed", { mode: "number" })
}).as(sql`SELECT course.id AS course_id, course.code AS course_code, course.name AS course_name, college.id AS college_id, college.name AS college_name, count(DISTINCT br.id) FILTER (WHERE br.submitted_at IS NOT NULL) AS total_requests, count(ba.id) FILTER (WHERE ba.released_at IS NOT NULL) AS total_assets_borrowed FROM courses course JOIN colleges college ON college.id = course.college_id LEFT JOIN users u ON u.course_id = course.id LEFT JOIN borrow_requests br ON br.borrower_id = u.id LEFT JOIN borrow_request_items bri ON bri.borrow_request_id = br.id LEFT JOIN borrow_allocations ba ON ba.borrow_request_item_id = bri.id GROUP BY course.id, course.code, course.name, college.id, college.name`);
var vwPeakBorrowingPeriods = pgView("vw_peak_borrowing_periods", {
  dayOfWeek: integer("day_of_week"),
  dayName: text("day_name"),
  hourOfDay: integer("hour_of_day"),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalAssetsReleased: bigint("total_assets_released", { mode: "number" })
}).as(sql`SELECT EXTRACT(isodow FROM released_at)::integer AS day_of_week, TRIM(BOTH FROM to_char(released_at, 'Day'::text)) AS day_name, EXTRACT(hour FROM released_at)::integer AS hour_of_day, count(*) AS total_assets_released FROM borrow_allocations WHERE released_at IS NOT NULL GROUP BY (EXTRACT(isodow FROM released_at)), (TRIM(BOTH FROM to_char(released_at, 'Day'::text))), (EXTRACT(hour FROM released_at))`);
var vwEquipmentQrLookup = pgView("vw_equipment_qr_lookup", {
  equipmentAssetId: uuid("equipment_asset_id"),
  qrToken: uuid("qr_token"),
  assetCode: varchar("asset_code", { length: 50 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  equipmentCatalogId: uuid("equipment_catalog_id"),
  equipmentName: varchar("equipment_name", { length: 150 }),
  categoryId: uuid("category_id"),
  categoryName: varchar("category_name", { length: 100 }),
  departmentId: uuid("department_id"),
  departmentName: varchar("department_name", { length: 150 }),
  currentCondition: equipmentCondition("current_condition"),
  operationalStatus: equipmentOperationalStatus("operational_status"),
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" })
}).as(sql`SELECT ea.id AS equipment_asset_id, ea.qr_token, ea.asset_code, ea.serial_number, ec.id AS equipment_catalog_id, ec.equipment_name, category.id AS category_id, category.name AS category_name, department.id AS department_id, department.name AS department_name, ea.current_condition, ea.operational_status, ea.archived_at FROM equipment_assets ea JOIN equipment_catalog ec ON ec.id = ea.equipment_catalog_id JOIN equipment_categories category ON category.id = ec.category_id LEFT JOIN departments department ON department.id = ea.department_id`);

// src/db/auth-schema.ts
var auth_schema_exports = {};
__export(auth_schema_exports, {
  authAccount: () => authAccount,
  authSchema: () => authSchema,
  authSession: () => authSession,
  authUser: () => authUser,
  authVerification: () => authVerification
});
import { boolean as boolean2, pgTable as pgTable2, text as text2, timestamp as timestamp2 } from "drizzle-orm/pg-core";
var authUser = pgTable2("auth_users", {
  id: text2("id").primaryKey(),
  name: text2("name").notNull(),
  email: text2("email").notNull().unique(),
  emailVerified: boolean2("email_verified").notNull().default(false),
  image: text2("image"),
  createdAt: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp2("updated_at", { withTimezone: true }).notNull().defaultNow()
});
var authSession = pgTable2("auth_sessions", {
  id: text2("id").primaryKey(),
  expiresAt: timestamp2("expires_at", { withTimezone: true }).notNull(),
  token: text2("token").notNull().unique(),
  createdAt: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp2("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text2("ip_address"),
  userAgent: text2("user_agent"),
  userId: text2("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" })
});
var authAccount = pgTable2("auth_accounts", {
  id: text2("id").primaryKey(),
  accountId: text2("account_id").notNull(),
  providerId: text2("provider_id").notNull(),
  userId: text2("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  accessToken: text2("access_token"),
  refreshToken: text2("refresh_token"),
  idToken: text2("id_token"),
  accessTokenExpiresAt: timestamp2("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp2("refresh_token_expires_at", { withTimezone: true }),
  scope: text2("scope"),
  password: text2("password"),
  createdAt: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp2("updated_at", { withTimezone: true }).notNull().defaultNow()
});
var authVerification = pgTable2("auth_verifications", {
  id: text2("id").primaryKey(),
  identifier: text2("identifier").notNull(),
  value: text2("value").notNull(),
  expiresAt: timestamp2("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp2("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp2("updated_at", { withTimezone: true }).notNull().defaultNow()
});
var authSchema = {
  auth_users: authUser,
  auth_sessions: authSession,
  auth_accounts: authAccount,
  auth_verifications: authVerification
};

// src/db/index.ts
var client;
function database() {
  client ??= postgres(serverEnv().DATABASE_URL, { max: 10, prepare: false });
  return drizzle(client, { schema: { ...schema_exports, ...auth_schema_exports } });
}
async function closeDatabase() {
  if (client) await client.end();
  client = void 0;
}

// src/auth/auth.ts
var env = serverEnv();
var auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.FRONTEND_URL],
  database: drizzleAdapter(database(), { provider: "pg", schema: authSchema }),
  user: { modelName: "auth_users" },
  session: { modelName: "auth_sessions" },
  account: { modelName: "auth_accounts" },
  verification: { modelName: "auth_verifications" },
  emailAndPassword: { enabled: true, autoSignIn: false, minPasswordLength: 10 }
});

// src/lib/errors.ts
import { APIError } from "better-auth/api";
var AppError = class extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
  statusCode;
  code;
};
function applicationError(error) {
  if (error instanceof AppError) return error;
  if (error instanceof APIError) {
    const code = typeof error.body === "object" && error.body !== null && "code" in error.body ? String(error.body.code) : "";
    if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")
      return new AppError(409, "EMAIL_EXISTS", "That email address is already registered.");
    if (code === "INVALID_EMAIL")
      return new AppError(422, "INVALID_EMAIL", "Enter a valid email address.");
    if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG")
      return new AppError(422, "INVALID_PASSWORD", "Choose a password that meets the stated requirements.");
  }
  return databaseError(error);
}
function databaseError(error) {
  let failure = error;
  for (let depth = 0; depth < 4; depth++) {
    if (typeof failure !== "object" || failure === null || !("cause" in failure) || !failure.cause) break;
    failure = failure.cause;
  }
  const code = typeof failure === "object" && failure !== null && "code" in failure ? String(failure.code) : "";
  const constraint = typeof failure === "object" && failure !== null && "constraint_name" in failure ? String(failure.constraint_name) : "";
  if (code === "23505") {
    if (constraint === "users_institutional_id_key")
      return new AppError(
        409,
        "INSTITUTIONAL_ID_EXISTS",
        "That institutional ID is already registered."
      );
    if (constraint === "users_email_key" || constraint === "auth_users_email_key" || constraint === "auth_users_email_unique")
      return new AppError(
        409,
        "EMAIL_EXISTS",
        "That email address is already registered."
      );
    return new AppError(409, "CONFLICT", "This record already exists.");
  }
  if (code === "23P01")
    return new AppError(
      409,
      "ALLOCATION_CONFLICT",
      "This equipment is already reserved for an overlapping schedule."
    );
  if (code === "23503")
    return new AppError(
      409,
      "RECORD_IN_USE",
      "This record cannot be removed because it is currently being used."
    );
  return new AppError(
    500,
    "DATABASE_ERROR",
    "The request could not be completed."
  );
}

// src/app.ts
import { ZodError } from "zod";

// src/auth/authorize.ts
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
async function requireProfile(request) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
  if (!session) throw new AppError(401, "UNAUTHORIZED", "Sign in to continue.");
  const [profile] = await database().select().from(users).where(eq(users.authUserId, session.user.id)).limit(1);
  if (!profile) throw new AppError(403, "PROFILE_MISSING", "This account is not linked to an LSMS profile.");
  return profile;
}
async function requireActiveProfile(request) {
  const profile = await requireProfile(request);
  if (profile.accountStatus !== "active") throw new AppError(403, "ACCOUNT_INACTIVE", "This account is awaiting activation or is unavailable.");
  return profile;
}
async function requirePermission(request, permission) {
  const profile = await requireActiveProfile(request);
  if (!can(profile.role, permission)) throw new AppError(403, "FORBIDDEN", "You do not have permission for this action.");
  return profile;
}

// src/modules/users/identity.service.ts
import { timingSafeEqual } from "crypto";
import { and, eq as eq2, or, sql as sql2 } from "drizzle-orm";
function equalSecret(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
async function setupAvailable() {
  const [existing] = await database().select({ id: users.id }).from(users).where(
    and(eq2(users.role, "super_admin"), eq2(users.accountStatus, "active"))
  ).limit(1);
  return !existing;
}
async function createFirstSuperAdmin(input) {
  if (!equalSecret(input.setupToken, serverEnv().INITIAL_SETUP_TOKEN)) {
    throw new AppError(
      403,
      "INVALID_SETUP_TOKEN",
      "The setup token is invalid."
    );
  }
  let authId;
  try {
    return await database().transaction(async (tx) => {
      await tx.execute(sql2`select pg_advisory_xact_lock(742611930)`);
      const [existing] = await tx.select({ id: users.id }).from(users).where(
        and(eq2(users.role, "super_admin"), eq2(users.accountStatus, "active"))
      ).limit(1);
      if (existing)
        throw new AppError(
          409,
          "SETUP_COMPLETE",
          "First-run setup is already complete."
        );
      const result = await auth.api.signUpEmail({
        body: {
          name: [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" "),
          email: input.email,
          password: input.password
        }
      });
      authId = result.user.id;
      const [profile] = await tx.insert(users).values({
        authUserId: authId,
        institutionalId: input.institutionalId,
        role: "super_admin",
        firstName: input.firstName,
        middleName: input.middleName ?? null,
        lastName: input.lastName,
        email: input.email,
        accountStatus: "active"
      }).returning({ id: users.id });
      await tx.insert(auditLogs).values({
        actorUserId: profile.id,
        action: "first_super_admin_created",
        entityType: "users",
        entityId: profile.id
      });
      return { id: profile.id };
    });
  } catch (error) {
    if (authId)
      await database().delete(authUser).where(eq2(authUser.id, authId)).catch(() => void 0);
    throw error;
  }
}
async function registerStudentFaculty(input) {
  let authId;
  try {
    return await database().transaction(async (tx) => {
      const [college] = await tx.select({ id: colleges.id }).from(colleges).where(
        and(eq2(colleges.id, input.collegeId), eq2(colleges.isActive, true))
      ).limit(1);
      if (!college)
        throw new AppError(422, "INVALID_COLLEGE", "Choose an active college.");
      if (input.courseId) {
        const [course] = await tx.select({ id: courses.id }).from(courses).where(
          and(
            eq2(courses.id, input.courseId),
            eq2(courses.collegeId, input.collegeId),
            eq2(courses.isActive, true)
          )
        ).limit(1);
        if (!course)
          throw new AppError(
            422,
            "INVALID_COURSE",
            "Choose an active course in the selected college."
          );
      }
      const result = await auth.api.signUpEmail({
        body: {
          name: [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" "),
          email: input.email,
          password: input.password
        }
      });
      authId = result.user.id;
      const [profile] = await tx.insert(users).values({
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
        accountStatus: "pending"
      }).returning({ id: users.id });
      await tx.insert(auditLogs).values({
        action: "student_faculty_registered",
        entityType: "users",
        entityId: profile.id
      });
      return { id: profile.id, accountStatus: "pending" };
    });
  } catch (error) {
    if (authId)
      await database().delete(authUser).where(eq2(authUser.id, authId)).catch(() => void 0);
    throw error;
  }
}
async function createAdmin(input, actorId) {
  let authId;
  try {
    return await database().transaction(async (tx) => {
      const [existingProfile] = await tx.select({ email: users.email, institutionalId: users.institutionalId }).from(users).where(or(eq2(users.email, input.email), eq2(users.institutionalId, input.institutionalId))).limit(1);
      if (existingProfile?.email.toLowerCase() === input.email)
        throw new AppError(409, "EMAIL_EXISTS", "That email address is already registered.");
      if (existingProfile?.institutionalId === input.institutionalId)
        throw new AppError(409, "INSTITUTIONAL_ID_EXISTS", "That institutional ID is already registered.");
      if (input.departmentId) {
        const [department] = await tx.select({ id: departments.id }).from(departments).where(
          and(
            eq2(departments.id, input.departmentId),
            eq2(departments.isActive, true)
          )
        ).limit(1);
        if (!department)
          throw new AppError(
            422,
            "INVALID_DEPARTMENT",
            "Choose an active department."
          );
      }
      const result = await auth.api.signUpEmail({
        body: {
          name: [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" "),
          email: input.email,
          password: input.password
        }
      });
      authId = result.user.id;
      const [profile] = await tx.insert(users).values({
        authUserId: authId,
        institutionalId: input.institutionalId,
        role: "admin",
        firstName: input.firstName,
        middleName: input.middleName ?? null,
        lastName: input.lastName,
        email: input.email,
        departmentId: input.departmentId ?? null,
        accountStatus: "active"
      }).returning({ id: users.id });
      await tx.insert(auditLogs).values({
        actorUserId: actorId,
        action: "admin.created",
        entityType: "users",
        entityId: profile.id
      });
      return { id: profile.id };
    });
  } catch (error) {
    if (authId)
      await database().delete(authUser).where(eq2(authUser.id, authId)).catch(() => void 0);
    throw error;
  }
}

// src/modules/users/identity.routes.ts
async function identityRoutes(app2) {
  app2.get("/api/v1/setup/status/", async () => ({
    available: await setupAvailable()
  }));
  app2.post(
    "/api/v1/setup/",
    { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const input = setupInput.parse(request.body);
      const result = await createFirstSuperAdmin(input);
      return reply.code(201).send(result);
    }
  );
  app2.post(
    "/api/v1/registration/",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } } },
    async (request, reply) => {
      const input = registrationInput.parse(request.body);
      const result = await registerStudentFaculty(input);
      return reply.code(201).send(result);
    }
  );
  app2.get("/api/v1/me/", async (request) => {
    const profile = await requireProfile(request);
    return {
      id: profile.id,
      institutionalId: profile.institutionalId,
      role: profile.role,
      personType: profile.personType,
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      email: profile.email,
      accountStatus: profile.accountStatus
    };
  });
  app2.post("/api/v1/staff/", async (request, reply) => {
    const actor = await requirePermission(request, "users.create_admin");
    return reply.code(201).send(await createAdmin(staffInput.parse(request.body), actor.id));
  });
}

// src/modules/organization/organization.routes.ts
import { z as z3 } from "zod";

// src/modules/organization/organization.service.ts
import { and as and2, count, eq as eq3, ilike, or as or2 } from "drizzle-orm";
var whereText = (q, code, name2) => q ? or2(ilike(code, `%${q}%`), ilike(name2, `%${q}%`)) : void 0;
async function listColleges(input) {
  const filter = and2(input.includeInactive ? void 0 : eq3(colleges.isActive, true), whereText(input.q, colleges.code, colleges.name));
  const [rows, totals] = await Promise.all([
    database().select().from(colleges).where(filter).orderBy(colleges.name).limit(input.limit).offset((input.page - 1) * input.limit),
    database().select({ total: count() }).from(colleges).where(filter)
  ]);
  return { data: rows, total: totals[0].total, page: input.page, limit: input.limit };
}
async function createCollege(input, actorId) {
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(colleges).values(input).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "college.created", entityType: "colleges", entityId: row.id });
    return row;
  });
}
async function updateCollege(id, input, actorId) {
  return database().transaction(async (tx) => {
    const [row] = await tx.update(colleges).set(input).where(eq3(colleges.id, id)).returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "College not found.");
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: row.isActive ? "college.updated" : "college.deactivated", entityType: "colleges", entityId: id });
    return row;
  });
}
async function listCourses(input) {
  const filter = and2(
    input.includeInactive ? void 0 : eq3(courses.isActive, true),
    input.collegeId ? eq3(courses.collegeId, input.collegeId) : void 0,
    input.q ? or2(ilike(courses.code, `%${input.q}%`), ilike(courses.name, `%${input.q}%`)) : void 0
  );
  const [rows, totals] = await Promise.all([
    database().select().from(courses).where(filter).orderBy(courses.name).limit(input.limit).offset((input.page - 1) * input.limit),
    database().select({ total: count() }).from(courses).where(filter)
  ]);
  return { data: rows, total: totals[0].total, page: input.page, limit: input.limit };
}
async function requireActiveCollege(id) {
  const [college] = await database().select({ id: colleges.id }).from(colleges).where(and2(eq3(colleges.id, id), eq3(colleges.isActive, true))).limit(1);
  if (!college) throw new AppError(422, "INVALID_COLLEGE", "Choose an active college.");
}
async function createCourse(input, actorId) {
  await requireActiveCollege(input.collegeId);
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(courses).values(input).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "course.created", entityType: "courses", entityId: row.id });
    return row;
  });
}
async function updateCourse(id, input, actorId) {
  if (input.collegeId) await requireActiveCollege(input.collegeId);
  return database().transaction(async (tx) => {
    const [row] = await tx.update(courses).set(input).where(eq3(courses.id, id)).returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "Course not found.");
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: row.isActive ? "course.updated" : "course.deactivated", entityType: "courses", entityId: id });
    return row;
  });
}
async function listDepartments(input) {
  const filter = and2(
    input.includeInactive ? void 0 : eq3(departments.isActive, true),
    input.q ? or2(ilike(departments.code, `%${input.q}%`), ilike(departments.name, `%${input.q}%`)) : void 0
  );
  const [rows, totals] = await Promise.all([
    database().select().from(departments).where(filter).orderBy(departments.name).limit(input.limit).offset((input.page - 1) * input.limit),
    database().select({ total: count() }).from(departments).where(filter)
  ]);
  return { data: rows, total: totals[0].total, page: input.page, limit: input.limit };
}
async function createDepartment(input, actorId) {
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(departments).values(input).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "department.created", entityType: "departments", entityId: row.id });
    return row;
  });
}
async function updateDepartment(id, input, actorId) {
  return database().transaction(async (tx) => {
    const [row] = await tx.update(departments).set(input).where(eq3(departments.id, id)).returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "Department not found.");
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: row.isActive ? "department.updated" : "department.deactivated", entityType: "departments", entityId: id });
    return row;
  });
}

// src/modules/organization/organization.routes.ts
async function organizationRoutes(app2) {
  app2.get("/api/v1/colleges/", async (request) => {
    const input = organizationListQuery.parse(request.query);
    if (input.includeInactive) await requirePermission(request, "organization.read");
    return listColleges(input);
  });
  app2.post("/api/v1/colleges/", async (request, reply) => {
    const actor = await requirePermission(request, "organization.write");
    return reply.code(201).send(await createCollege(organizationInput.parse(request.body), actor.id));
  });
  app2.patch("/api/v1/colleges/:id/", async (request) => {
    const actor = await requirePermission(request, "organization.write");
    return updateCollege(uuidParam.parse(request.params).id, organizationUpdate.parse(request.body), actor.id);
  });
  app2.get("/api/v1/courses/", async (request) => {
    const input = organizationListQuery.extend({ collegeId: z3.uuid().optional() }).parse(request.query);
    if (input.includeInactive) await requirePermission(request, "organization.read");
    return listCourses(input);
  });
  app2.post("/api/v1/courses/", async (request, reply) => {
    const actor = await requirePermission(request, "organization.write");
    return reply.code(201).send(await createCourse(courseInput.parse(request.body), actor.id));
  });
  app2.patch("/api/v1/courses/:id/", async (request) => {
    const actor = await requirePermission(request, "organization.write");
    return updateCourse(uuidParam.parse(request.params).id, courseUpdate.parse(request.body), actor.id);
  });
  app2.get("/api/v1/departments/", async (request) => {
    const input = organizationListQuery.parse(request.query);
    if (input.includeInactive) await requirePermission(request, "organization.read");
    return listDepartments(input);
  });
  app2.post("/api/v1/departments/", async (request, reply) => {
    const actor = await requirePermission(request, "organization.write");
    return reply.code(201).send(await createDepartment(departmentInput.parse(request.body), actor.id));
  });
  app2.patch("/api/v1/departments/:id/", async (request) => {
    const actor = await requirePermission(request, "organization.write");
    return updateDepartment(uuidParam.parse(request.params).id, departmentUpdate.parse(request.body), actor.id);
  });
}

// src/modules/users/accounts.service.ts
import { and as and3, count as count2, eq as eq4, ilike as ilike2, ne, or as or3 } from "drizzle-orm";

// src/modules/users/account-rules.ts
function canSetStatus(from, to) {
  return from === "pending" && to === "active" || from === "active" && (to === "suspended" || to === "archived") || from === "suspended" && (to === "active" || to === "archived");
}

// src/modules/users/accounts.service.ts
async function listManageableUsers(input) {
  const filter = and3(
    ne(users.role, "super_admin"),
    input.status ? eq4(users.accountStatus, input.status) : void 0,
    input.q ? or3(
      ilike2(users.firstName, `%${input.q}%`),
      ilike2(users.lastName, `%${input.q}%`),
      ilike2(users.institutionalId, `%${input.q}%`)
    ) : void 0
  );
  const [rows, totals] = await Promise.all([
    database().select({
      id: users.id,
      institutionalId: users.institutionalId,
      role: users.role,
      personType: users.personType,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      accountStatus: users.accountStatus,
      createdAt: users.createdAt
    }).from(users).where(filter).orderBy(users.createdAt).limit(input.limit).offset((input.page - 1) * input.limit),
    database().select({ total: count2() }).from(users).where(filter)
  ]);
  return {
    data: rows,
    total: totals[0].total,
    page: input.page,
    limit: input.limit
  };
}
async function changeUserStatus(id, input, actorId) {
  return database().transaction(async (tx) => {
    const [target] = await tx.select().from(users).where(eq4(users.id, id)).for("update").limit(1);
    if (!target) throw new AppError(404, "NOT_FOUND", "User not found.");
    if (target.role === "super_admin")
      throw new AppError(
        403,
        "FORBIDDEN",
        "Super Admin accounts cannot be changed here."
      );
    if (!canSetStatus(target.accountStatus, input.status))
      throw new AppError(
        409,
        "INVALID_STATUS",
        "This account status change is not allowed."
      );
    const [row] = await tx.update(users).set({
      accountStatus: input.status,
      archivedAt: input.status === "archived" ? (/* @__PURE__ */ new Date()).toISOString() : null
    }).where(eq4(users.id, id)).returning({ id: users.id, accountStatus: users.accountStatus });
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: `user.${input.status}`,
      entityType: "users",
      entityId: id,
      metadata: { previousStatus: target.accountStatus }
    });
    await tx.insert(notifications).values({
      userId: id,
      notificationType: "account_status",
      title: "Account status changed",
      message: input.status === "active" ? "Your LSMS account is active." : `Your LSMS account is ${input.status}.`,
      relatedEntityType: "users",
      relatedEntityId: id
    });
    return row;
  });
}

// src/modules/users/accounts.routes.ts
async function accountsRoutes(app2) {
  app2.get("/api/v1/users/", async (request) => {
    await requirePermission(request, "users.manage");
    return listManageableUsers(userListQuery.parse(request.query));
  });
  app2.post("/api/v1/users/:id/status/", async (request) => {
    const actor = await requirePermission(request, "users.manage");
    return changeUserStatus(
      uuidParam.parse(request.params).id,
      userStatusInput.parse(request.body),
      actor.id
    );
  });
}

// src/modules/equipment/equipment.routes.ts
import QRCode from "qrcode";
import { eq as eq6 } from "drizzle-orm";

// src/modules/equipment/equipment.service.ts
import { and as and4, count as count3, eq as eq5, ilike as ilike3, isNull, or as or4 } from "drizzle-orm";
async function listCategories(query) {
  const filter = and4(
    query.includeInactive ? void 0 : eq5(equipmentCategories.isActive, true),
    query.q ? ilike3(equipmentCategories.name, `%${query.q}%`) : void 0
  );
  const [data, totals] = await Promise.all([
    database().select().from(equipmentCategories).where(filter).orderBy(equipmentCategories.name).limit(query.limit).offset((query.page - 1) * query.limit),
    database().select({ total: count3() }).from(equipmentCategories).where(filter)
  ]);
  return { data, total: totals[0].total, page: query.page, limit: query.limit };
}
async function createCategory(input, actorId) {
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(equipmentCategories).values(input).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "equipment_category.created", entityType: "equipment_categories", entityId: row.id });
    return row;
  });
}
async function updateCategory(id, input, actorId) {
  return database().transaction(async (tx) => {
    const [row] = await tx.update(equipmentCategories).set(input).where(eq5(equipmentCategories.id, id)).returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "Category not found.");
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "equipment_category.updated", entityType: "equipment_categories", entityId: id });
    return row;
  });
}
async function listCatalog(query) {
  const filter = and4(
    query.includeInactive ? void 0 : eq5(equipmentCatalog.isActive, true),
    query.categoryId ? eq5(equipmentCatalog.categoryId, query.categoryId) : void 0,
    query.q ? ilike3(equipmentCatalog.equipmentName, `%${query.q}%`) : void 0
  );
  const [data, totals] = await Promise.all([
    database().select({
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
      reservedUnits: vwEquipmentInventorySummary.reservedUnits
    }).from(equipmentCatalog).leftJoin(vwEquipmentInventorySummary, eq5(equipmentCatalog.id, vwEquipmentInventorySummary.equipmentCatalogId)).where(filter).orderBy(equipmentCatalog.equipmentName).limit(query.limit).offset((query.page - 1) * query.limit),
    database().select({ total: count3() }).from(equipmentCatalog).where(filter)
  ]);
  return { data: data.map((row) => ({
    ...row,
    totalUnits: row.totalUnits ?? 0,
    availableUnits: row.availableUnits ?? 0,
    borrowedUnits: row.borrowedUnits ?? 0,
    reservedUnits: row.reservedUnits ?? 0
  })), total: totals[0].total, page: query.page, limit: query.limit };
}
async function requireActiveCategory(id) {
  const [row] = await database().select({ id: equipmentCategories.id }).from(equipmentCategories).where(and4(eq5(equipmentCategories.id, id), eq5(equipmentCategories.isActive, true))).limit(1);
  if (!row) throw new AppError(422, "INVALID_CATEGORY", "Choose an active category.");
}
async function createCatalog(input, actorId) {
  await requireActiveCategory(input.categoryId);
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(equipmentCatalog).values(input).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "equipment_catalog.created", entityType: "equipment_catalog", entityId: row.id });
    return row;
  });
}
async function updateCatalog(id, input, actorId) {
  if (input.categoryId) await requireActiveCategory(input.categoryId);
  return database().transaction(async (tx) => {
    const [row] = await tx.update(equipmentCatalog).set({ ...input, archivedAt: input.isActive === false ? (/* @__PURE__ */ new Date()).toISOString() : input.isActive === true ? null : void 0 }).where(eq5(equipmentCatalog.id, id)).returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "Catalog item not found.");
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "equipment_catalog.updated", entityType: "equipment_catalog", entityId: id });
    return row;
  });
}
async function listAssets(query) {
  const filter = and4(
    query.includeInactive ? void 0 : isNull(equipmentAssets.archivedAt),
    query.catalogId ? eq5(equipmentAssets.equipmentCatalogId, query.catalogId) : void 0,
    query.q ? or4(ilike3(equipmentAssets.assetCode, `%${query.q}%`), ilike3(equipmentAssets.serialNumber, `%${query.q}%`)) : void 0
  );
  const [data, totals] = await Promise.all([
    database().select({
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
      equipmentName: vwEquipmentAssetAvailability.equipmentName
    }).from(equipmentAssets).leftJoin(vwEquipmentAssetAvailability, eq5(equipmentAssets.id, vwEquipmentAssetAvailability.equipmentAssetId)).where(filter).orderBy(equipmentAssets.assetCode).limit(query.limit).offset((query.page - 1) * query.limit),
    database().select({ total: count3() }).from(equipmentAssets).where(filter)
  ]);
  return { data, total: totals[0].total, page: query.page, limit: query.limit };
}
async function requireValidAssetRelations(input) {
  if (input.equipmentCatalogId) {
    const [row] = await database().select({ id: equipmentCatalog.id }).from(equipmentCatalog).where(and4(eq5(equipmentCatalog.id, input.equipmentCatalogId), eq5(equipmentCatalog.isActive, true))).limit(1);
    if (!row) throw new AppError(422, "INVALID_CATALOG", "Choose an active catalog item.");
  }
  if (input.departmentId) {
    const [row] = await database().select({ id: departments.id }).from(departments).where(and4(eq5(departments.id, input.departmentId), eq5(departments.isActive, true))).limit(1);
    if (!row) throw new AppError(422, "INVALID_DEPARTMENT", "Choose an active department.");
  }
}
async function createAsset(input, actorId) {
  await requireValidAssetRelations(input);
  return database().transaction(async (tx) => {
    const [row] = await tx.insert(equipmentAssets).values(input).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "equipment_asset.created", entityType: "equipment_assets", entityId: row.id });
    return row;
  });
}
async function updateAsset(id, input, actorId) {
  await requireValidAssetRelations(input);
  const { archive, ...changes } = input;
  return database().transaction(async (tx) => {
    const [row] = await tx.update(equipmentAssets).set({ ...changes, archivedAt: archive === true ? (/* @__PURE__ */ new Date()).toISOString() : void 0 }).where(eq5(equipmentAssets.id, id)).returning();
    if (!row) throw new AppError(404, "NOT_FOUND", "Equipment asset not found.");
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: archive ? "equipment_asset.archived" : "equipment_asset.updated", entityType: "equipment_assets", entityId: id });
    return row;
  });
}
async function lookupQr(token) {
  const [row] = await database().select({
    assetCode: vwEquipmentQrLookup.assetCode,
    equipmentName: vwEquipmentQrLookup.equipmentName,
    categoryName: vwEquipmentQrLookup.categoryName,
    departmentName: vwEquipmentQrLookup.departmentName,
    currentCondition: vwEquipmentQrLookup.currentCondition,
    operationalStatus: vwEquipmentQrLookup.operationalStatus,
    availabilityStatus: vwEquipmentAssetAvailability.availabilityStatus
  }).from(vwEquipmentQrLookup).leftJoin(vwEquipmentAssetAvailability, eq5(vwEquipmentQrLookup.equipmentAssetId, vwEquipmentAssetAvailability.equipmentAssetId)).where(eq5(vwEquipmentQrLookup.qrToken, token)).limit(1);
  if (!row) throw new AppError(404, "NOT_FOUND", "Equipment QR code not found.");
  return row;
}

// src/modules/equipment/equipment.routes.ts
async function equipmentRoutes(app2) {
  app2.get("/api/v1/equipment/categories/", async (request) => {
    await requirePermission(request, "equipment.read");
    const query = equipmentListQuery.parse(request.query);
    if (query.includeInactive) await requirePermission(request, "equipment.write");
    return listCategories(query);
  });
  app2.post("/api/v1/equipment/categories/", async (request, reply) => {
    const actor = await requirePermission(request, "equipment.write");
    return reply.code(201).send(await createCategory(categoryInput.parse(request.body), actor.id));
  });
  app2.patch("/api/v1/equipment/categories/:id/", async (request) => {
    const actor = await requirePermission(request, "equipment.write");
    return updateCategory(uuidParam.parse(request.params).id, categoryUpdate.parse(request.body), actor.id);
  });
  app2.get("/api/v1/equipment/catalog/", async (request) => {
    await requirePermission(request, "equipment.read");
    const query = equipmentListQuery.parse(request.query);
    if (query.includeInactive) await requirePermission(request, "equipment.write");
    return listCatalog(query);
  });
  app2.post("/api/v1/equipment/catalog/", async (request, reply) => {
    const actor = await requirePermission(request, "equipment.write");
    return reply.code(201).send(await createCatalog(catalogInput.parse(request.body), actor.id));
  });
  app2.patch("/api/v1/equipment/catalog/:id/", async (request) => {
    const actor = await requirePermission(request, "equipment.write");
    return updateCatalog(uuidParam.parse(request.params).id, catalogUpdate.parse(request.body), actor.id);
  });
  app2.get("/api/v1/equipment/assets/", async (request) => {
    const actor = await requireActiveProfile(request);
    if (actor.role === "student_faculty") throw new AppError(403, "FORBIDDEN", "Asset management is restricted to staff.");
    const query = equipmentListQuery.parse(request.query);
    if (query.includeInactive && actor.role !== "admin") throw new AppError(403, "FORBIDDEN", "Archived inventory is restricted to Admin.");
    return listAssets(query);
  });
  app2.post("/api/v1/equipment/assets/", async (request, reply) => {
    const actor = await requirePermission(request, "equipment.write");
    return reply.code(201).send(await createAsset(assetInput.parse(request.body), actor.id));
  });
  app2.patch("/api/v1/equipment/assets/:id/", async (request) => {
    const actor = await requirePermission(request, "equipment.write");
    return updateAsset(uuidParam.parse(request.params).id, assetUpdate.parse(request.body), actor.id);
  });
  app2.get("/api/v1/equipment/assets/:id/qr/", async (request, reply) => {
    await requirePermission(request, "qr.manage");
    const id = uuidParam.parse(request.params).id;
    const [asset] = await database().select({ qrToken: equipmentAssets.qrToken }).from(equipmentAssets).where(eq6(equipmentAssets.id, id)).limit(1);
    if (!asset) throw new AppError(404, "NOT_FOUND", "Equipment asset not found.");
    const url = `${serverEnv().FRONTEND_URL.replace(/\/$/, "")}/equipment/q/${asset.qrToken}/`;
    return reply.type("image/svg+xml").send(await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M" }));
  });
  app2.get("/api/v1/equipment/qr/:id/", async (request) => {
    await requireActiveProfile(request);
    return lookupQr(uuidParam.parse(request.params).id);
  });
}

// src/modules/borrowing/custody.service.ts
import { and as and5, count as count4, eq as eq7, inArray, sql as sql3 } from "drizzle-orm";

// src/modules/borrowing/rules.ts
function canCancelRequest(status) {
  return status === "draft" || status === "submitted";
}
function validApproval(requested, approved) {
  return Number.isInteger(requested) && Number.isInteger(approved) && requested > 0 && approved >= 0 && approved <= requested;
}
function returnRequestStatus(released, returned) {
  if (released < 1 || returned < 1 || returned > released) throw new Error("Invalid return counts");
  return returned === released ? "returned" : "partially_returned";
}

// src/modules/borrowing/custody.service.ts
async function allocateAsset(requestId, actorId, input) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq7(borrowRequests.id, requestId)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "approved" && request.status !== "ready_for_release") throw new AppError(409, "INVALID_STATUS", "Approve the request before allocating assets.");
    const [item] = await tx.select().from(borrowRequestItems).where(eq7(borrowRequestItems.id, input.itemId)).for("update").limit(1);
    if (!item || item.borrowRequestId !== requestId || !item.quantityApproved) throw new AppError(422, "INVALID_ITEM", "Choose an approved request item.");
    const [asset] = await tx.select().from(equipmentAssets).where(eq7(equipmentAssets.id, input.assetId)).limit(1);
    if (!asset || asset.equipmentCatalogId !== item.equipmentCatalogId || asset.operationalStatus !== "active" || asset.archivedAt)
      throw new AppError(422, "INVALID_ASSET", "Choose an active, compatible physical asset.");
    const [overlap] = await tx.select({ id: borrowAllocations.id }).from(borrowAllocations).where(and5(
      eq7(borrowAllocations.equipmentAssetId, input.assetId),
      inArray(borrowAllocations.allocationStatus, ["reserved", "released"]),
      sql3`${borrowAllocations.reservationPeriod} && tstzrange(${request.requestedBorrowAt}::timestamptz, ${request.requestedDueAt}::timestamptz, '[)')`
    )).limit(1);
    if (overlap) throw new AppError(409, "ALLOCATION_CONFLICT", "This equipment is already reserved for an overlapping schedule.");
    const [allocated] = await tx.select({ total: count4() }).from(borrowAllocations).where(and5(eq7(borrowAllocations.borrowRequestItemId, item.id), inArray(borrowAllocations.allocationStatus, ["reserved", "released"])));
    if (allocated.total >= item.quantityApproved) throw new AppError(409, "QUANTITY_FILLED", "This item already has its approved number of assets.");
    const [row] = await tx.insert(borrowAllocations).values({
      borrowRequestItemId: item.id,
      equipmentAssetId: asset.id,
      reservationPeriod: sql3`tstzrange(${request.requestedBorrowAt}::timestamptz, ${request.requestedDueAt}::timestamptz, '[)')`,
      allocatedBy: actorId
    }).returning();
    const items = await tx.select({ id: borrowRequestItems.id, quantityApproved: borrowRequestItems.quantityApproved }).from(borrowRequestItems).where(eq7(borrowRequestItems.borrowRequestId, requestId));
    const [total] = await tx.select({ value: count4() }).from(borrowAllocations).innerJoin(borrowRequestItems, eq7(borrowAllocations.borrowRequestItemId, borrowRequestItems.id)).where(and5(eq7(borrowRequestItems.borrowRequestId, requestId), inArray(borrowAllocations.allocationStatus, ["reserved", "released"])));
    if (total.value === items.reduce((sum, current) => sum + (current.quantityApproved ?? 0), 0) && request.status === "approved") {
      await tx.update(borrowRequests).set({ status: "ready_for_release" }).where(eq7(borrowRequests.id, requestId));
      await tx.insert(notifications).values({
        userId: request.borrowerId,
        notificationType: "ready_for_release",
        title: "Equipment ready for release",
        message: `Request ${request.requestNumber} has been allocated.`,
        relatedEntityType: "borrow_requests",
        relatedEntityId: requestId
      });
    }
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "equipment_asset.allocated",
      entityType: "borrow_allocations",
      entityId: row.id,
      metadata: { requestId, assetId: asset.id }
    });
    return row;
  });
}
async function releaseRequest(requestId, actorId, input) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq7(borrowRequests.id, requestId)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "ready_for_release") throw new AppError(409, "INVALID_STATUS", "All approved assets must be allocated before release.");
    const allocations = await tx.select({ id: borrowAllocations.id, allocationStatus: borrowAllocations.allocationStatus }).from(borrowAllocations).innerJoin(borrowRequestItems, eq7(borrowAllocations.borrowRequestItemId, borrowRequestItems.id)).where(eq7(borrowRequestItems.borrowRequestId, requestId));
    if (allocations.length !== input.allocations.length || allocations.some((row) => row.allocationStatus !== "reserved" || !input.allocations.some((item) => item.allocationId === row.id)))
      throw new AppError(422, "INVALID_ALLOCATIONS", "Release every reserved asset in this request together.");
    const releasedAt = (/* @__PURE__ */ new Date()).toISOString();
    for (const item of input.allocations) {
      await tx.update(borrowAllocations).set({
        allocationStatus: "released",
        releasedBy: actorId,
        releasedAt,
        releaseCondition: item.condition,
        releaseNotes: item.notes ?? null
      }).where(eq7(borrowAllocations.id, item.allocationId));
    }
    const [updated] = await tx.update(borrowRequests).set({ status: "borrowed" }).where(eq7(borrowRequests.id, requestId)).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "equipment.released", entityType: "borrow_requests", entityId: requestId });
    await tx.insert(notifications).values({
      userId: request.borrowerId,
      notificationType: "equipment_released",
      title: "Equipment released",
      message: `Equipment for request ${request.requestNumber} has been released.`,
      relatedEntityType: "borrow_requests",
      relatedEntityId: requestId
    });
    return updated;
  });
}
async function processReturn(actorId, input) {
  return database().transaction(async (tx) => {
    const [allocation] = await tx.select({
      id: borrowAllocations.id,
      allocationStatus: borrowAllocations.allocationStatus,
      borrowRequestId: borrowRequestItems.borrowRequestId
    }).from(borrowAllocations).innerJoin(borrowRequestItems, eq7(borrowAllocations.borrowRequestItemId, borrowRequestItems.id)).where(eq7(borrowAllocations.id, input.allocationId)).for("update").limit(1);
    if (!allocation) throw new AppError(404, "NOT_FOUND", "Custody record not found.");
    if (allocation.allocationStatus !== "released") throw new AppError(409, "INVALID_STATUS", "Only released equipment can be returned.");
    const [request] = await tx.select().from(borrowRequests).where(eq7(borrowRequests.id, allocation.borrowRequestId)).for("update").limit(1);
    if (!request || request.status !== "borrowed" && request.status !== "partially_returned")
      throw new AppError(409, "INVALID_STATUS", "This request is not in active custody.");
    const [record] = await tx.insert(returnRecords).values({
      allocationId: allocation.id,
      processedBy: actorId,
      conditionAfter: input.conditionAfter,
      outcome: input.outcome,
      remarks: input.remarks ?? null
    }).returning();
    const [totals] = await tx.select({ total: count4(), returned: sql3`count(*) filter (where ${borrowAllocations.allocationStatus} = 'returned')::int` }).from(borrowAllocations).innerJoin(borrowRequestItems, eq7(borrowAllocations.borrowRequestItemId, borrowRequestItems.id)).where(and5(eq7(borrowRequestItems.borrowRequestId, request.id), inArray(borrowAllocations.allocationStatus, ["released", "returned"])));
    const status = returnRequestStatus(totals.total, totals.returned);
    await tx.update(borrowRequests).set({ status }).where(eq7(borrowRequests.id, request.id));
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "equipment.returned",
      entityType: "return_records",
      entityId: record.id,
      metadata: { requestId: request.id, allocationId: allocation.id, outcome: input.outcome }
    });
    await tx.insert(notifications).values({
      userId: request.borrowerId,
      notificationType: "equipment_returned",
      title: "Equipment return recorded",
      message: `A physical asset from request ${request.requestNumber} was returned.`,
      relatedEntityType: "borrow_requests",
      relatedEntityId: request.id
    });
    return { record, requestStatus: status };
  });
}
async function listCustody(page, limit, borrowerId) {
  const filter = borrowerId ? eq7(vwCurrentCustody.borrowerId, borrowerId) : void 0;
  const [data, totals] = await Promise.all([
    database().select().from(vwCurrentCustody).where(filter).orderBy(vwCurrentCustody.dueAt).limit(limit).offset((page - 1) * limit),
    database().select({ total: count4() }).from(vwCurrentCustody).where(filter)
  ]);
  return { data, total: totals[0].total, page, limit };
}
async function listOverdue(page, limit) {
  const [data, totals] = await Promise.all([
    database().select().from(vwOverdueLoans).orderBy(vwOverdueLoans.dueAt).limit(limit).offset((page - 1) * limit),
    database().select({ total: count4() }).from(vwOverdueLoans)
  ]);
  return { data, total: totals[0].total, page, limit };
}
async function listAccountability(page, limit, borrowerId) {
  const filter = borrowerId ? eq7(vwAccountabilityRecords.borrowerId, borrowerId) : void 0;
  const [data, totals] = await Promise.all([
    database().select().from(vwAccountabilityRecords).where(filter).orderBy(vwAccountabilityRecords.releasedAt).limit(limit).offset((page - 1) * limit),
    database().select({ total: count4() }).from(vwAccountabilityRecords).where(filter)
  ]);
  return { data, total: totals[0].total, page, limit };
}

// src/modules/borrowing/requests.service.ts
import { and as and6, count as count5, desc, eq as eq8, ilike as ilike4, inArray as inArray2, or as or5 } from "drizzle-orm";
function validateSchedule(input) {
  if (Date.parse(input.requestedBorrowAt) < Date.now() - 6e4) throw new AppError(422, "INVALID_SCHEDULE", "Borrow date must be in the future.");
}
async function createDraft(input, borrowerId) {
  validateSchedule(input);
  return database().transaction(async (tx) => {
    const ids = input.items.map((item) => item.equipmentCatalogId);
    const activeCatalog = await tx.select({ id: equipmentCatalog.id }).from(equipmentCatalog).where(and6(inArray2(equipmentCatalog.id, ids), eq8(equipmentCatalog.isActive, true)));
    if (activeCatalog.length !== ids.length) throw new AppError(422, "INVALID_EQUIPMENT", "Choose active equipment types.");
    const [request] = await tx.insert(borrowRequests).values({
      borrowerId,
      purpose: input.purpose,
      requestedBorrowAt: input.requestedBorrowAt,
      requestedDueAt: input.requestedDueAt
    }).returning();
    await tx.insert(borrowRequestItems).values(input.items.map((item) => ({ ...item, borrowRequestId: request.id })));
    await tx.insert(auditLogs).values({ actorUserId: borrowerId, action: "borrow_request.draft_created", entityType: "borrow_requests", entityId: request.id });
    return request;
  });
}
async function updateDraft(id, input, borrowerId) {
  validateSchedule(input);
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq8(borrowRequests.id, id)).for("update").limit(1);
    if (!request || request.borrowerId !== borrowerId) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "draft") throw new AppError(409, "INVALID_STATUS", "Only draft requests can be edited.");
    const ids = input.items.map((item) => item.equipmentCatalogId);
    const activeCatalog = await tx.select({ id: equipmentCatalog.id }).from(equipmentCatalog).where(and6(inArray2(equipmentCatalog.id, ids), eq8(equipmentCatalog.isActive, true)));
    if (activeCatalog.length !== ids.length) throw new AppError(422, "INVALID_EQUIPMENT", "Choose active equipment types.");
    await tx.delete(borrowRequestItems).where(eq8(borrowRequestItems.borrowRequestId, id));
    await tx.insert(borrowRequestItems).values(input.items.map((item) => ({ ...item, borrowRequestId: id })));
    const [updated] = await tx.update(borrowRequests).set({
      purpose: input.purpose,
      requestedBorrowAt: input.requestedBorrowAt,
      requestedDueAt: input.requestedDueAt
    }).where(eq8(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: borrowerId, action: "borrow_request.draft_updated", entityType: "borrow_requests", entityId: id });
    return updated;
  });
}
async function listRequests(input, actor) {
  if (actor.role === "admin") throw new AppError(403, "FORBIDDEN", "Borrowing operations are restricted to the Super Admin.");
  const filter = and6(
    actor.role === "student_faculty" ? eq8(borrowRequests.borrowerId, actor.id) : void 0,
    input.status ? eq8(borrowRequests.status, input.status) : void 0,
    input.q ? or5(ilike4(borrowRequests.requestNumber, `%${input.q}%`), ilike4(borrowRequests.purpose, `%${input.q}%`)) : void 0
  );
  const [data, totals] = await Promise.all([
    database().select({
      id: borrowRequests.id,
      requestNumber: borrowRequests.requestNumber,
      borrowerId: borrowRequests.borrowerId,
      purpose: borrowRequests.purpose,
      requestedBorrowAt: borrowRequests.requestedBorrowAt,
      requestedDueAt: borrowRequests.requestedDueAt,
      status: borrowRequests.status,
      createdAt: borrowRequests.createdAt,
      institutionalId: users.institutionalId,
      firstName: users.firstName,
      lastName: users.lastName
    }).from(borrowRequests).innerJoin(users, eq8(borrowRequests.borrowerId, users.id)).where(filter).orderBy(desc(borrowRequests.createdAt)).limit(input.limit).offset((input.page - 1) * input.limit),
    database().select({ total: count5() }).from(borrowRequests).where(filter)
  ]);
  return { data, total: totals[0].total, page: input.page, limit: input.limit };
}
async function getRequest(id, actor) {
  if (actor.role === "admin") throw new AppError(403, "FORBIDDEN", "Borrowing operations are restricted to the Super Admin.");
  const [request] = await database().select({
    id: borrowRequests.id,
    requestNumber: borrowRequests.requestNumber,
    borrowerId: borrowRequests.borrowerId,
    purpose: borrowRequests.purpose,
    requestedBorrowAt: borrowRequests.requestedBorrowAt,
    requestedDueAt: borrowRequests.requestedDueAt,
    status: borrowRequests.status,
    reviewNotes: borrowRequests.reviewNotes,
    rejectionReason: borrowRequests.rejectionReason,
    createdAt: borrowRequests.createdAt,
    institutionalId: users.institutionalId,
    firstName: users.firstName,
    lastName: users.lastName
  }).from(borrowRequests).innerJoin(users, eq8(borrowRequests.borrowerId, users.id)).where(eq8(borrowRequests.id, id)).limit(1);
  if (!request || actor.role === "student_faculty" && request.borrowerId !== actor.id) throw new AppError(404, "NOT_FOUND", "Request not found.");
  const [items, history] = await Promise.all([
    database().select({
      id: borrowRequestItems.id,
      equipmentCatalogId: borrowRequestItems.equipmentCatalogId,
      equipmentName: equipmentCatalog.equipmentName,
      quantityRequested: borrowRequestItems.quantityRequested,
      quantityApproved: borrowRequestItems.quantityApproved
    }).from(borrowRequestItems).innerJoin(equipmentCatalog, eq8(borrowRequestItems.equipmentCatalogId, equipmentCatalog.id)).where(eq8(borrowRequestItems.borrowRequestId, id)),
    database().select({
      newStatus: borrowRequestStatusHistory.newStatus,
      changedAt: borrowRequestStatusHistory.changedAt,
      remarks: borrowRequestStatusHistory.remarks
    }).from(borrowRequestStatusHistory).where(eq8(borrowRequestStatusHistory.borrowRequestId, id)).orderBy(desc(borrowRequestStatusHistory.changedAt))
  ]);
  const allocations = actor.role === "super_admin" ? await database().select({
    id: borrowAllocations.id,
    borrowRequestItemId: borrowAllocations.borrowRequestItemId,
    equipmentAssetId: borrowAllocations.equipmentAssetId,
    assetCode: equipmentAssets.assetCode,
    allocationStatus: borrowAllocations.allocationStatus,
    releaseCondition: borrowAllocations.releaseCondition,
    releasedAt: borrowAllocations.releasedAt
  }).from(borrowAllocations).innerJoin(equipmentAssets, eq8(borrowAllocations.equipmentAssetId, equipmentAssets.id)).where(inArray2(borrowAllocations.borrowRequestItemId, items.map((item) => item.id))) : [];
  return { ...request, items, history, allocations };
}
async function submitRequest(id, borrowerId) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq8(borrowRequests.id, id)).for("update").limit(1);
    if (!request || request.borrowerId !== borrowerId) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "draft") throw new AppError(409, "INVALID_STATUS", "Only draft requests can be submitted.");
    if (Date.parse(request.requestedBorrowAt) < Date.now() - 6e4) throw new AppError(422, "INVALID_SCHEDULE", "Borrow date must be in the future.");
    const [itemCount] = await tx.select({ value: count5() }).from(borrowRequestItems).where(eq8(borrowRequestItems.borrowRequestId, id));
    if (itemCount.value < 1) throw new AppError(422, "EMPTY_REQUEST", "Add equipment before submitting.");
    const [updated] = await tx.update(borrowRequests).set({ status: "submitted", submittedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq8(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: borrowerId, action: "borrow_request.submitted", entityType: "borrow_requests", entityId: id });
    await tx.insert(notifications).values({
      userId: borrowerId,
      notificationType: "request_submitted",
      title: "Borrowing request submitted",
      message: `Request ${request.requestNumber} was submitted.`,
      relatedEntityType: "borrow_requests",
      relatedEntityId: id
    });
    return updated;
  });
}
async function cancelRequest(id, borrowerId) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq8(borrowRequests.id, id)).for("update").limit(1);
    if (!request || request.borrowerId !== borrowerId) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (!canCancelRequest(request.status)) throw new AppError(409, "INVALID_STATUS", "This request can no longer be cancelled.");
    const [updated] = await tx.update(borrowRequests).set({ status: "cancelled" }).where(eq8(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: borrowerId, action: "borrow_request.cancelled", entityType: "borrow_requests", entityId: id });
    return updated;
  });
}
async function startReview(id, actorId, input) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq8(borrowRequests.id, id)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "submitted") throw new AppError(409, "INVALID_STATUS", "Only submitted requests can move under review.");
    const [updated] = await tx.update(borrowRequests).set({ status: "under_review", reviewedBy: actorId, reviewedAt: (/* @__PURE__ */ new Date()).toISOString(), reviewNotes: input.notes ?? null }).where(eq8(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "borrow_request.review_started", entityType: "borrow_requests", entityId: id });
    return updated;
  });
}
async function approveRequest(id, actorId, input) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq8(borrowRequests.id, id)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "submitted" && request.status !== "under_review") throw new AppError(409, "INVALID_STATUS", "This request cannot be approved.");
    const items = await tx.select().from(borrowRequestItems).where(eq8(borrowRequestItems.borrowRequestId, id));
    if (items.length !== input.items.length || new Set(input.items.map((item) => item.itemId)).size !== items.length)
      throw new AppError(422, "INVALID_ITEMS", "Provide an approved quantity for every requested item.");
    for (const item of items) {
      const approval = input.items.find((candidate) => candidate.itemId === item.id);
      if (!approval || !validApproval(item.quantityRequested, approval.quantityApproved))
        throw new AppError(422, "INVALID_QUANTITY", "Approved quantities must be between zero and the requested quantities.");
      await tx.update(borrowRequestItems).set({ quantityApproved: approval.quantityApproved }).where(eq8(borrowRequestItems.id, item.id));
    }
    const [updated] = await tx.update(borrowRequests).set({
      status: "approved",
      reviewedBy: actorId,
      reviewedAt: (/* @__PURE__ */ new Date()).toISOString(),
      reviewNotes: input.notes ?? null
    }).where(eq8(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "borrow_request.approved",
      entityType: "borrow_requests",
      entityId: id,
      metadata: { quantities: input.items.map((item) => ({ itemId: item.itemId, quantityApproved: item.quantityApproved })) }
    });
    await tx.insert(notifications).values({
      userId: request.borrowerId,
      notificationType: "request_approved",
      title: "Borrowing request approved",
      message: `Request ${request.requestNumber} was approved.`,
      relatedEntityType: "borrow_requests",
      relatedEntityId: id
    });
    return updated;
  });
}
async function rejectRequest(id, actorId, input) {
  return database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq8(borrowRequests.id, id)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (request.status !== "submitted" && request.status !== "under_review") throw new AppError(409, "INVALID_STATUS", "This request cannot be rejected.");
    const [updated] = await tx.update(borrowRequests).set({
      status: "rejected",
      reviewedBy: actorId,
      reviewedAt: (/* @__PURE__ */ new Date()).toISOString(),
      reviewNotes: input.notes ?? null,
      rejectionReason: input.reason
    }).where(eq8(borrowRequests.id, id)).returning();
    await tx.insert(auditLogs).values({ actorUserId: actorId, action: "borrow_request.rejected", entityType: "borrow_requests", entityId: id });
    await tx.insert(notifications).values({
      userId: request.borrowerId,
      notificationType: "request_rejected",
      title: "Borrowing request rejected",
      message: `Request ${request.requestNumber} was rejected.`,
      relatedEntityType: "borrow_requests",
      relatedEntityId: id
    });
    return updated;
  });
}

// src/modules/borrowing/borrowing.routes.ts
async function borrowingRoutes(app2) {
  app2.get("/api/v1/borrow-requests/", async (request) => {
    const actor = await requireActiveProfile(request);
    return listRequests(borrowListQuery.parse(request.query), actor);
  });
  app2.post("/api/v1/borrow-requests/", async (request, reply) => {
    const actor = await requirePermission(request, "borrow_request.create");
    return reply.code(201).send(await createDraft(borrowRequestInput.parse(request.body), actor.id));
  });
  app2.get("/api/v1/borrow-requests/:id/", async (request) => {
    const actor = await requireActiveProfile(request);
    return getRequest(uuidParam.parse(request.params).id, actor);
  });
  app2.patch("/api/v1/borrow-requests/:id/", async (request) => {
    const actor = await requirePermission(request, "borrow_request.create");
    return updateDraft(uuidParam.parse(request.params).id, borrowRequestInput.parse(request.body), actor.id);
  });
  app2.post("/api/v1/borrow-requests/:id/submit/", async (request) => {
    const actor = await requirePermission(request, "borrow_request.create");
    return submitRequest(uuidParam.parse(request.params).id, actor.id);
  });
  app2.post("/api/v1/borrow-requests/:id/cancel/", async (request) => {
    const actor = await requirePermission(request, "borrow_request.cancel_own");
    return cancelRequest(uuidParam.parse(request.params).id, actor.id);
  });
  app2.post("/api/v1/borrow-requests/:id/review/", async (request) => {
    const actor = await requirePermission(request, "borrowing.review");
    return startReview(uuidParam.parse(request.params).id, actor.id, reviewInput.parse(request.body ?? {}));
  });
  app2.post("/api/v1/borrow-requests/:id/approve/", async (request) => {
    const actor = await requirePermission(request, "borrowing.approve");
    return approveRequest(uuidParam.parse(request.params).id, actor.id, approvalInput.parse(request.body));
  });
  app2.post("/api/v1/borrow-requests/:id/reject/", async (request) => {
    const actor = await requirePermission(request, "borrowing.reject");
    return rejectRequest(uuidParam.parse(request.params).id, actor.id, rejectionInput.parse(request.body));
  });
  app2.post("/api/v1/borrow-requests/:id/allocations/", async (request, reply) => {
    const actor = await requirePermission(request, "borrowing.allocate");
    return reply.code(201).send(await allocateAsset(uuidParam.parse(request.params).id, actor.id, allocationInput.parse(request.body)));
  });
  app2.post("/api/v1/borrow-requests/:id/release/", async (request) => {
    const actor = await requirePermission(request, "custody.release");
    return releaseRequest(uuidParam.parse(request.params).id, actor.id, releaseInput.parse(request.body));
  });
  app2.post("/api/v1/returns/", async (request, reply) => {
    const actor = await requirePermission(request, "custody.return");
    return reply.code(201).send(await processReturn(actor.id, returnInput.parse(request.body)));
  });
  app2.get("/api/v1/custody/", async (request) => {
    const actor = await requireActiveProfile(request);
    if (actor.role === "admin") throw new AppError(403, "FORBIDDEN", "Custody records are restricted.");
    const { page, limit } = listQuery.parse(request.query);
    return listCustody(page, limit, actor.role === "student_faculty" ? actor.id : void 0);
  });
  app2.get("/api/v1/overdue/", async (request) => {
    await requirePermission(request, "overdue.read");
    const { page, limit } = listQuery.parse(request.query);
    return listOverdue(page, limit);
  });
  app2.get("/api/v1/accountability/", async (request) => {
    const actor = await requireActiveProfile(request);
    if (actor.role === "admin") throw new AppError(403, "FORBIDDEN", "Accountability records are restricted.");
    const { page, limit } = listQuery.parse(request.query);
    return listAccountability(page, limit, actor.role === "student_faculty" ? actor.id : void 0);
  });
}

// src/modules/iso/requisition.service.ts
import { createHash } from "crypto";
import { eq as eq9, desc as desc2, count as count6 } from "drizzle-orm";

// src/lib/storage.ts
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
var LocalDocumentStorage = class {
  constructor(directory = process.env.ISO_STORAGE_DIR ?? ".storage") {
    this.directory = directory;
  }
  directory;
  path(key) {
    if (!/^[0-9a-f-]{36}\.pdf$/i.test(key))
      throw new Error("Invalid document key");
    return join(this.directory, key);
  }
  async put(key, bytes) {
    await mkdir(this.directory, { recursive: true });
    await writeFile(this.path(key), bytes);
  }
  async get(key) {
    return readFile(this.path(key));
  }
};
var documentStorage = new LocalDocumentStorage();

// src/modules/iso/requisition.pdf.ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
async function renderDevelopmentRequisition(data) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = 595;
  const height = 842;
  let page = doc.addPage([width, height]);
  let y = height - 56;
  const line = (value, size = 10, strong = false) => {
    if (y < 70) {
      page = doc.addPage([width, height]);
      y = height - 55;
    }
    page.drawText(value.slice(0, 105), {
      x: 48,
      y,
      size,
      font: strong ? bold : font,
      color: rgb(0.08, 0.16, 0.2)
    });
    y -= size + 11;
  };
  line("LSMS DEVELOPMENT REQUISITION RECORD", 16, true);
  line(
    "Unofficial layout for FM-DSSC-RLS-002. Replace with the approved template when supplied.",
    9
  );
  y -= 10;
  line(`Form number: ${data.formNumber}`, 11, true);
  line(`Request number: ${data.requestNumber}`);
  line(`Borrower: ${data.borrower}`);
  line(`Institutional ID: ${data.institutionalId}`);
  line(`Purpose: ${data.purpose}`);
  line(
    `Borrow schedule: ${new Date(data.requestedBorrowAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`
  );
  line(
    `Due schedule: ${new Date(data.requestedDueAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`
  );
  line(
    `Generated: ${new Date(data.generatedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}`
  );
  y -= 10;
  line("Approved equipment", 12, true);
  for (const item of data.items) {
    if (!item.quantityApproved) continue;
    line(`${item.equipmentName} x ${item.quantityApproved}`, 10, true);
    line(
      `Allocated asset codes: ${item.assetCodes.join(", ") || "Not yet allocated"}`,
      9
    );
  }
  return doc.save();
}

// src/modules/iso/requisition.service.ts
async function createRequisition(requestId, actorId) {
  const record = await database().transaction(async (tx) => {
    const [request] = await tx.select().from(borrowRequests).where(eq9(borrowRequests.id, requestId)).for("update").limit(1);
    if (!request) throw new AppError(404, "NOT_FOUND", "Request not found.");
    if (![
      "approved",
      "ready_for_release",
      "borrowed",
      "partially_returned",
      "returned"
    ].includes(request.status))
      throw new AppError(
        409,
        "INVALID_STATUS",
        "Approve the request before generating a requisition."
      );
    const [existing] = await tx.select().from(isoRequisitions).where(eq9(isoRequisitions.borrowRequestId, requestId)).limit(1);
    if (existing) return existing;
    const [row] = await tx.insert(isoRequisitions).values({ borrowRequestId: requestId, generatedBy: actorId }).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "iso_requisition.generated",
      entityType: "iso_requisitions",
      entityId: row.id
    });
    return row;
  });
  let storageStatus = "stored";
  try {
    const bytes = await generateRequisitionPdf(record.id, actorId);
    const key = `${record.id}.pdf`;
    await documentStorage.put(key, bytes);
    await database().update(isoRequisitions).set({
      storageBucket: "local",
      storagePath: key,
      documentHash: createHash("sha256").update(bytes).digest("hex")
    }).where(eq9(isoRequisitions.id, record.id));
  } catch {
    storageStatus = "regeneration_only";
  }
  return { ...record, storageStatus };
}
async function generateRequisitionPdf(id, actorId) {
  const [record] = await database().select().from(isoRequisitions).where(eq9(isoRequisitions.id, id)).limit(1);
  if (!record) throw new AppError(404, "NOT_FOUND", "Requisition not found.");
  const request = await getRequest(record.borrowRequestId, {
    id: actorId,
    role: "super_admin"
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
      assetCodes: request.allocations.filter((allocation) => allocation.borrowRequestItemId === item.id).map((allocation) => allocation.assetCode)
    }))
  });
}
async function listRequisitions(page, limit) {
  const [data, totals] = await Promise.all([
    database().select({
      id: isoRequisitions.id,
      formNumber: isoRequisitions.formNumber,
      borrowRequestId: isoRequisitions.borrowRequestId,
      generatedAt: isoRequisitions.generatedAt,
      releasedAt: isoRequisitions.releasedAt,
      requestNumber: borrowRequests.requestNumber
    }).from(isoRequisitions).innerJoin(
      borrowRequests,
      eq9(isoRequisitions.borrowRequestId, borrowRequests.id)
    ).orderBy(desc2(isoRequisitions.generatedAt)).limit(limit).offset((page - 1) * limit),
    database().select({ total: count6() }).from(isoRequisitions)
  ]);
  return { data, total: totals[0].total, page, limit };
}
async function markRequisitionReleased(id, actorId) {
  return database().transaction(async (tx) => {
    const [record] = await tx.select().from(isoRequisitions).where(eq9(isoRequisitions.id, id)).for("update").limit(1);
    if (!record) throw new AppError(404, "NOT_FOUND", "Requisition not found.");
    if (record.releasedAt)
      throw new AppError(
        409,
        "ALREADY_RELEASED",
        "This requisition was already marked released."
      );
    const [updated] = await tx.update(isoRequisitions).set({ releasedAt: (/* @__PURE__ */ new Date()).toISOString() }).where(eq9(isoRequisitions.id, id)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "iso_requisition.released",
      entityType: "iso_requisitions",
      entityId: id
    });
    return updated;
  });
}

// src/modules/iso/requisition.routes.ts
async function requisitionRoutes(app2) {
  app2.get("/api/v1/iso/", async (request) => {
    await requirePermission(request, "iso.generate");
    const { page, limit } = listQuery.parse(request.query);
    return listRequisitions(page, limit);
  });
  app2.post("/api/v1/borrow-requests/:id/iso/", async (request, reply) => {
    const actor = await requirePermission(request, "iso.generate");
    return reply.code(201).send(
      await createRequisition(uuidParam.parse(request.params).id, actor.id)
    );
  });
  app2.get("/api/v1/iso/:id/pdf/", async (request, reply) => {
    const actor = await requirePermission(request, "iso.generate");
    const id = uuidParam.parse(request.params).id;
    const bytes = await generateRequisitionPdf(id, actor.id);
    const query = request.query;
    reply.header(
      "Content-Disposition",
      `${query.download === "true" ? "attachment" : "inline"}; filename="lsms-requisition-${id}.pdf"`
    );
    return reply.type("application/pdf").send(Buffer.from(bytes));
  });
  app2.post("/api/v1/iso/:id/release/", async (request) => {
    const actor = await requirePermission(request, "iso.generate");
    return markRequisitionReleased(
      uuidParam.parse(request.params).id,
      actor.id
    );
  });
}

// src/modules/notifications/notifications.routes.ts
import { and as and7, count as count7, desc as desc3, eq as eq10, isNull as isNull2 } from "drizzle-orm";
async function notificationRoutes(app2) {
  app2.get("/api/v1/notifications/", async (request) => {
    const actor = await requireActiveProfile(request);
    const { page, limit } = listQuery.parse(request.query);
    const [data, totals, unread] = await Promise.all([
      database().select().from(notifications).where(eq10(notifications.userId, actor.id)).orderBy(desc3(notifications.createdAt)).limit(limit).offset((page - 1) * limit),
      database().select({ total: count7() }).from(notifications).where(eq10(notifications.userId, actor.id)),
      database().select({ total: count7() }).from(notifications).where(and7(eq10(notifications.userId, actor.id), isNull2(notifications.readAt)))
    ]);
    return { data, total: totals[0].total, unreadCount: unread[0].total, page, limit };
  });
  app2.post("/api/v1/notifications/:id/read/", async (request) => {
    const actor = await requireActiveProfile(request);
    const id = uuidParam.parse(request.params).id;
    const [row] = await database().update(notifications).set({ readAt: (/* @__PURE__ */ new Date()).toISOString() }).where(and7(eq10(notifications.id, id), eq10(notifications.userId, actor.id))).returning({ id: notifications.id });
    if (!row) throw new AppError(404, "NOT_FOUND", "Notification not found.");
    return row;
  });
  app2.post("/api/v1/notifications/read-all/", async (request) => {
    const actor = await requireActiveProfile(request);
    await database().update(notifications).set({ readAt: (/* @__PURE__ */ new Date()).toISOString() }).where(and7(eq10(notifications.userId, actor.id), isNull2(notifications.readAt)));
    return { ok: true };
  });
}

// src/modules/analytics/analytics.routes.ts
import { sql as sql4 } from "drizzle-orm";
import { z as z4 } from "zod";
var analyticsViews = {
  "borrowing-trends": "vw_borrowing_trends_monthly",
  "equipment-usage": "vw_equipment_usage",
  "inventory-utilization": "vw_inventory_utilization",
  "user-frequency": "vw_user_borrowing_frequency",
  "college-frequency": "vw_college_borrowing_frequency",
  "course-frequency": "vw_course_borrowing_frequency",
  "peak-periods": "vw_peak_borrowing_periods",
  "inventory-overview": "vw_equipment_inventory_summary"
};
var reports = {
  inventory: { source: "vw_equipment_inventory_summary", roles: ["admin"] },
  "borrowing-history": { source: "(select br.request_number, br.status, br.purpose, br.requested_borrow_at, br.requested_due_at, u.institutional_id from borrow_requests br join users u on u.id = br.borrower_id) as report", roles: ["admin", "super_admin"] },
  "equipment-usage": { source: "vw_equipment_usage", roles: ["admin"] },
  utilization: { source: "vw_inventory_utilization", roles: ["admin"] },
  "borrowing-frequency": { source: "vw_user_borrowing_frequency", roles: ["admin"] },
  custody: { source: "vw_current_custody", roles: ["super_admin"] },
  overdue: { source: "vw_overdue_loans", roles: ["super_admin"] },
  accountability: { source: "vw_accountability_records", roles: ["admin", "super_admin"] }
};
function csvCell(value) {
  const raw = value === null || value === void 0 ? "" : value instanceof Date ? value.toISOString() : String(value);
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
async function analyticsRoutes(app2) {
  app2.get("/api/v1/analytics/:key/", async (request) => {
    await requirePermission(request, "analytics.read");
    const key = z4.enum(Object.keys(analyticsViews)).parse(request.params.key);
    const { page, limit } = listQuery.parse(request.query);
    const view = sql4.raw(analyticsViews[key]);
    const [data, totals] = await Promise.all([
      database().execute(sql4`select * from ${view} limit ${limit} offset ${(page - 1) * limit}`),
      database().execute(sql4`select count(*)::int as total from ${view}`)
    ]);
    return { data: Array.from(data), total: Number(totals[0].total), page, limit };
  });
  app2.get("/api/v1/reports/:key/", async (request) => {
    const actor = await requireActiveProfile(request);
    const key = z4.enum(Object.keys(reports)).parse(request.params.key);
    if (!reports[key].roles.includes(actor.role)) throw new AppError(403, "FORBIDDEN", "This report is not available to your role.");
    const { page, limit } = listQuery.parse(request.query);
    const source = sql4.raw(reports[key].source);
    const [data, totals] = await Promise.all([
      database().execute(sql4`select * from ${source} limit ${limit} offset ${(page - 1) * limit}`),
      database().execute(sql4`select count(*)::int as total from ${source}`)
    ]);
    return { data: Array.from(data), total: Number(totals[0].total), page, limit };
  });
  app2.get("/api/v1/reports/:key/csv/", async (request, reply) => {
    const actor = await requireActiveProfile(request);
    const key = z4.enum(Object.keys(reports)).parse(request.params.key);
    if (!reports[key].roles.includes(actor.role)) throw new AppError(403, "FORBIDDEN", "This report is not available to your role.");
    const rows = await database().execute(sql4`select * from ${sql4.raw(reports[key].source)} limit 10000`);
    const data = Array.from(rows);
    const columns = data.length ? Object.keys(data[0]) : [];
    const csv = [columns.map(csvCell).join(","), ...data.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\r\n");
    reply.header("Content-Disposition", `attachment; filename="lsms-${key}.csv"`);
    reply.header("X-Export-Limit", "10000");
    return reply.type("text/csv; charset=utf-8").send(`\uFEFF${csv}`);
  });
}

// src/modules/analytics/dashboard.routes.ts
import { sql as sql5 } from "drizzle-orm";
async function dashboardRoutes(app2) {
  app2.get("/api/v1/dashboard/", async (request) => {
    const actor = await requireActiveProfile(request);
    if (actor.role === "super_admin") {
      const [requests2, custody2, overdue, returns] = await Promise.all([
        database().execute(sql5`select status::text as status, count(*)::int as total from borrow_requests group by status`),
        database().execute(sql5`select count(*)::int as total from vw_current_custody`),
        database().execute(sql5`select count(*)::int as total from vw_overdue_loans`),
        database().execute(sql5`select count(*)::int as total from return_records where returned_at > now() - interval '7 days'`)
      ]);
      const countStatus2 = (status) => Number(requests2.find((row) => row.status === status)?.total ?? 0);
      return { cards: [
        { label: "Submitted requests", value: countStatus2("submitted") },
        { label: "Under review", value: countStatus2("under_review") },
        { label: "Ready for release", value: countStatus2("ready_for_release") },
        { label: "Borrowed assets", value: Number(custody2[0].total) },
        { label: "Overdue assets", value: Number(overdue[0].total) },
        { label: "Returns this week", value: Number(returns[0].total) }
      ] };
    }
    if (actor.role === "admin") {
      const [assets, pending, usage] = await Promise.all([
        database().execute(sql5`select availability_status, count(*)::int as total from vw_equipment_asset_availability group by availability_status`),
        database().execute(sql5`select count(*)::int as total from users where account_status = 'pending'`),
        database().execute(sql5`select coalesce(sum(total_borrow_count), 0)::int as total from vw_equipment_usage`)
      ]);
      const countState = (state) => Number(assets.find((row) => row.availability_status === state)?.total ?? 0);
      return { cards: [
        { label: "Physical assets", value: assets.reduce((sum, row) => sum + Number(row.total), 0) },
        { label: "Available", value: countState("available") },
        { label: "Borrowed", value: countState("borrowed") },
        { label: "Maintenance", value: countState("maintenance") },
        { label: "Damaged", value: countState("damaged") },
        { label: "Pending accounts", value: Number(pending[0].total) },
        { label: "Recorded asset uses", value: Number(usage[0].total) }
      ] };
    }
    const [requests, custody, notifications2] = await Promise.all([
      database().execute(sql5`select status::text as status, count(*)::int as total from borrow_requests where borrower_id = ${actor.id}::uuid group by status`),
      database().execute(sql5`select count(*)::int as total from vw_current_custody where borrower_id = ${actor.id}::uuid`),
      database().execute(sql5`select count(*)::int as total from notifications where user_id = ${actor.id}::uuid and read_at is null`)
    ]);
    const countStatus = (status) => Number(requests.find((row) => row.status === status)?.total ?? 0);
    return { cards: [
      { label: "Draft requests", value: countStatus("draft") },
      { label: "Submitted requests", value: countStatus("submitted") },
      { label: "Approved requests", value: countStatus("approved") },
      { label: "Assets in custody", value: Number(custody[0].total) },
      { label: "Unread notifications", value: Number(notifications2[0].total) }
    ] };
  });
}

// src/app.ts
async function createApp() {
  const env3 = serverEnv();
  const app2 = Fastify({ logger: true, routerOptions: { ignoreTrailingSlash: false } });
  await app2.register(cors, { origin: env3.FRONTEND_URL, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] });
  await app2.register(helmet);
  await app2.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  app2.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if (error instanceof ZodError) {
      return reply.code(422).send({ error: { code: "VALIDATION_ERROR", message: "Check the submitted fields.", fields: error.flatten().fieldErrors } });
    }
    if (typeof error === "object" && error !== null && "statusCode" in error && error.statusCode === 429) {
      return reply.code(429).send({ error: { code: "RATE_LIMITED", message: "Too many requests. Try again later." } });
    }
    const appError = applicationError(error);
    reply.code(appError.statusCode).send({ error: { code: appError.code, message: appError.message } });
  });
  app2.get("/health/", async () => {
    await database().execute("select 1");
    return { status: "ok" };
  });
  app2.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: async (request, reply) => {
      if (request.method === "POST" && request.url.startsWith("/api/auth/sign-up/email")) {
        throw new AppError(403, "USE_REGISTRATION", "Use the LSMS registration form.");
      }
      if (request.method === "POST" && request.url.startsWith("/api/auth/change-password")) {
        strongPassword.parse(request.body?.newPassword);
      }
      const url = new URL(request.url, env3.BETTER_AUTH_URL);
      const headers = fromNodeHeaders2(request.headers);
      const response = await auth.handler(new Request(url, {
        method: request.method,
        headers,
        ...request.body ? { body: JSON.stringify(request.body) } : {}
      }));
      reply.code(response.status);
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header("set-cookie", cookies);
      return reply.send(response.body ? await response.text() : null);
    }
  });
  await app2.register(identityRoutes);
  await app2.register(organizationRoutes);
  await app2.register(accountsRoutes);
  await app2.register(equipmentRoutes);
  await app2.register(borrowingRoutes);
  await app2.register(requisitionRoutes);
  await app2.register(notificationRoutes);
  await app2.register(analyticsRoutes);
  await app2.register(dashboardRoutes);
  return app2;
}

// src/server.ts
var app = await createApp();
var env2 = serverEnv();
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await app.close();
    await closeDatabase();
    process.exit(0);
  });
}
await app.listen({ port: env2.PORT, host: "0.0.0.0" });
