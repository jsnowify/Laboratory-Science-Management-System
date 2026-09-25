import {
  pgTable,
  unique,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  foreignKey,
  check,
  text,
  date,
  integer,
  jsonb,
  inet,
  pgView,
  bigint,
  interval,
  numeric,
  pgSequence,
  pgEnum,
  customType,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const citext = customType<{ data: string }>({ dataType: () => "citext" });
const tstzrange = customType<{ data: string }>({ dataType: () => "tstzrange" });

export const accountStatus = pgEnum("account_status", [
  "pending",
  "active",
  "suspended",
  "archived",
]);
export const allocationStatus = pgEnum("allocation_status", [
  "reserved",
  "released",
  "returned",
  "cancelled",
]);
export const borrowRequestStatus = pgEnum("borrow_request_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "ready_for_release",
  "borrowed",
  "partially_returned",
  "returned",
  "cancelled",
]);
export const equipmentCondition = pgEnum("equipment_condition", [
  "excellent",
  "good",
  "fair",
  "damaged",
]);
export const equipmentOperationalStatus = pgEnum(
  "equipment_operational_status",
  ["active", "maintenance", "damaged", "retired"],
);
export const personType = pgEnum("person_type", ["student", "faculty"]);
export const returnOutcome = pgEnum("return_outcome", [
  "normal",
  "damaged",
  "maintenance_required",
]);
export const userRole = pgEnum("user_role", [
  "super_admin",
  "admin",
  "student_faculty",
]);

export const borrowRequestNumberSeq = pgSequence("borrow_request_number_seq", {
  startWith: "1",
  increment: "1",
  minValue: "1",
  maxValue: "9223372036854775807",
  cache: "1",
  cycle: false,
});
export const isoRequisitionNumberSeq = pgSequence(
  "iso_requisition_number_seq",
  {
    startWith: "1",
    increment: "1",
    minValue: "1",
    maxValue: "9223372036854775807",
    cache: "1",
    cycle: false,
  },
);

export const colleges = pgTable(
  "colleges",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    code: varchar({ length: 30 }).notNull(),
    name: varchar({ length: 150 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("colleges_code_key").on(table.code),
    unique("colleges_name_key").on(table.name),
  ],
);

export const courses = pgTable(
  "courses",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    collegeId: uuid("college_id").notNull(),
    code: varchar({ length: 30 }).notNull(),
    name: varchar({ length: 150 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_courses_college").using(
      "btree",
      table.collegeId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.collegeId],
      foreignColumns: [colleges.id],
      name: "courses_college_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    unique("uq_course_code_per_college").on(table.collegeId, table.code),
    unique("uq_course_name_per_college").on(table.name, table.collegeId),
  ],
);

export const users = pgTable(
  "users",
  {
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
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_users_account_status").using(
      "btree",
      table.accountStatus.asc().nullsLast().op("enum_ops"),
    ),
    index("idx_users_college").using(
      "btree",
      table.collegeId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_users_course").using(
      "btree",
      table.courseId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_users_department").using(
      "btree",
      table.departmentId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_users_role").using(
      "btree",
      table.role.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.collegeId],
      foreignColumns: [colleges.id],
      name: "users_college_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.courseId],
      foreignColumns: [courses.id],
      name: "users_course_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: "users_department_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    unique("users_auth_user_id_key").on(table.authUserId),
    unique("users_institutional_id_key").on(table.institutionalId),
    unique("users_email_key").on(table.email),
    check(
      "chk_person_type_by_role",
      sql`((role = 'student_faculty'::user_role) AND (person_type IS NOT NULL)) OR ((role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])) AND (person_type IS NULL))`,
    ),
  ],
);

export const departments = pgTable(
  "departments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    code: varchar({ length: 30 }),
    name: varchar({ length: 150 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("departments_code_key").on(table.code),
    unique("departments_name_key").on(table.name),
  ],
);

export const equipmentCategories = pgTable(
  "equipment_categories",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    description: text(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("equipment_categories_name_key").on(table.name)],
);

export const equipmentCatalog = pgTable(
  "equipment_catalog",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    categoryId: uuid("category_id").notNull(),
    equipmentName: varchar("equipment_name", { length: 150 }).notNull(),
    description: text(),
    manufacturer: varchar({ length: 150 }),
    model: varchar({ length: 150 }),
    unitOfMeasure: varchar("unit_of_measure", { length: 50 })
      .default("unit")
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_equipment_catalog_category").using(
      "btree",
      table.categoryId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_equipment_catalog_name").using(
      "btree",
      table.equipmentName.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [equipmentCategories.id],
      name: "equipment_catalog_category_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const equipmentAssets = pgTable(
  "equipment_assets",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    equipmentCatalogId: uuid("equipment_catalog_id").notNull(),
    assetCode: varchar("asset_code", { length: 50 }).notNull(),
    qrToken: uuid("qr_token").defaultRandom().notNull(),
    serialNumber: varchar("serial_number", { length: 100 }),
    departmentId: uuid("department_id"),
    currentCondition: equipmentCondition("current_condition")
      .default("good")
      .notNull(),
    operationalStatus: equipmentOperationalStatus("operational_status")
      .default("active")
      .notNull(),
    acquisitionDate: date("acquisition_date"),
    notes: text(),
    archivedAt: timestamp("archived_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_equipment_assets_catalog").using(
      "btree",
      table.equipmentCatalogId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_equipment_assets_condition").using(
      "btree",
      table.currentCondition.asc().nullsLast().op("enum_ops"),
    ),
    index("idx_equipment_assets_department").using(
      "btree",
      table.departmentId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_equipment_assets_status").using(
      "btree",
      table.operationalStatus.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.equipmentCatalogId],
      foreignColumns: [equipmentCatalog.id],
      name: "equipment_assets_equipment_catalog_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: "equipment_assets_department_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    unique("equipment_assets_asset_code_key").on(table.assetCode),
    unique("equipment_assets_qr_token_key").on(table.qrToken),
    unique("equipment_assets_serial_number_key").on(table.serialNumber),
  ],
);

export const borrowRequests = pgTable(
  "borrow_requests",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    requestNumber: varchar("request_number", { length: 30 })
      .default(sql`generate_borrow_request_number()`)
      .notNull(),
    borrowerId: uuid("borrower_id").notNull(),
    purpose: text().notNull(),
    requestedBorrowAt: timestamp("requested_borrow_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    requestedDueAt: timestamp("requested_due_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    status: borrowRequestStatus().default("draft").notNull(),
    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
      mode: "string",
    }),
    reviewedAt: timestamp("reviewed_at", {
      withTimezone: true,
      mode: "string",
    }),
    reviewedBy: uuid("reviewed_by"),
    reviewNotes: text("review_notes"),
    rejectionReason: text("rejection_reason"),
    cancellationReason: text("cancellation_reason"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_borrow_requests_borrower").using(
      "btree",
      table.borrowerId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_borrow_requests_schedule").using(
      "btree",
      table.requestedBorrowAt.asc().nullsLast().op("timestamptz_ops"),
      table.requestedDueAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    index("idx_borrow_requests_status").using(
      "btree",
      table.status.asc().nullsLast().op("enum_ops"),
    ),
    index("idx_borrow_requests_submitted").using(
      "btree",
      table.submittedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    foreignKey({
      columns: [table.borrowerId],
      foreignColumns: [users.id],
      name: "borrow_requests_borrower_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.reviewedBy],
      foreignColumns: [users.id],
      name: "borrow_requests_reviewed_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    unique("borrow_requests_request_number_key").on(table.requestNumber),
    check(
      "chk_valid_borrow_period",
      sql`requested_due_at > requested_borrow_at`,
    ),
  ],
);

export const borrowRequestItems = pgTable(
  "borrow_request_items",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    borrowRequestId: uuid("borrow_request_id").notNull(),
    equipmentCatalogId: uuid("equipment_catalog_id").notNull(),
    quantityRequested: integer("quantity_requested").notNull(),
    quantityApproved: integer("quantity_approved"),
    remarks: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_borrow_request_items_catalog").using(
      "btree",
      table.equipmentCatalogId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_borrow_request_items_request").using(
      "btree",
      table.borrowRequestId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.borrowRequestId],
      foreignColumns: [borrowRequests.id],
      name: "borrow_request_items_borrow_request_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.equipmentCatalogId],
      foreignColumns: [equipmentCatalog.id],
      name: "borrow_request_items_equipment_catalog_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    unique("uq_request_equipment_type").on(
      table.equipmentCatalogId,
      table.borrowRequestId,
    ),
    check("chk_requested_quantity_positive", sql`quantity_requested > 0`),
    check(
      "chk_approved_quantity",
      sql`(quantity_approved IS NULL) OR ((quantity_approved >= 0) AND (quantity_approved <= quantity_requested))`,
    ),
  ],
);

export const borrowAllocations = pgTable(
  "borrow_allocations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    borrowRequestItemId: uuid("borrow_request_item_id").notNull(),
    equipmentAssetId: uuid("equipment_asset_id").notNull(),
    reservationPeriod: tstzrange("reservation_period").notNull(),
    allocationStatus: allocationStatus("allocation_status")
      .default("reserved")
      .notNull(),
    allocatedBy: uuid("allocated_by").notNull(),
    allocatedAt: timestamp("allocated_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    releasedBy: uuid("released_by"),
    releasedAt: timestamp("released_at", {
      withTimezone: true,
      mode: "string",
    }),
    releaseCondition: equipmentCondition("release_condition"),
    releaseNotes: text("release_notes"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_borrow_allocations_asset").using(
      "btree",
      table.equipmentAssetId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_borrow_allocations_request_item").using(
      "btree",
      table.borrowRequestItemId.asc().nullsLast().op("uuid_ops"),
    ),
    index("idx_borrow_allocations_status").using(
      "btree",
      table.allocationStatus.asc().nullsLast().op("enum_ops"),
    ),
    foreignKey({
      columns: [table.borrowRequestItemId],
      foreignColumns: [borrowRequestItems.id],
      name: "borrow_allocations_borrow_request_item_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.equipmentAssetId],
      foreignColumns: [equipmentAssets.id],
      name: "borrow_allocations_equipment_asset_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.allocatedBy],
      foreignColumns: [users.id],
      name: "borrow_allocations_allocated_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.releasedBy],
      foreignColumns: [users.id],
      name: "borrow_allocations_released_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    unique("uq_request_item_asset").on(
      table.equipmentAssetId,
      table.borrowRequestItemId,
    ),
    check(
      "chk_reservation_period",
      sql`lower(reservation_period) < upper(reservation_period)`,
    ),
    check(
      "chk_release_information",
      sql`(allocation_status = ANY (ARRAY['reserved'::allocation_status, 'cancelled'::allocation_status])) OR ((released_by IS NOT NULL) AND (released_at IS NOT NULL) AND (release_condition IS NOT NULL))`,
    ),
  ],
);

export const returnRecords = pgTable(
  "return_records",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    allocationId: uuid("allocation_id").notNull(),
    processedBy: uuid("processed_by").notNull(),
    returnedAt: timestamp("returned_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    conditionAfter: equipmentCondition("condition_after").notNull(),
    outcome: returnOutcome().default("normal").notNull(),
    remarks: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_return_records_returned_at").using(
      "btree",
      table.returnedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    foreignKey({
      columns: [table.allocationId],
      foreignColumns: [borrowAllocations.id],
      name: "return_records_allocation_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.processedBy],
      foreignColumns: [users.id],
      name: "return_records_processed_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    unique("return_records_allocation_id_key").on(table.allocationId),
  ],
);

export const isoRequisitions = pgTable(
  "iso_requisitions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    borrowRequestId: uuid("borrow_request_id").notNull(),
    formNumber: varchar("form_number", { length: 60 })
      .default(sql`generate_iso_requisition_number()`)
      .notNull(),
    generatedBy: uuid("generated_by").notNull(),
    generatedAt: timestamp("generated_at", {
      withTimezone: true,
      mode: "string",
    })
      .defaultNow()
      .notNull(),
    releasedAt: timestamp("released_at", {
      withTimezone: true,
      mode: "string",
    }),
    storageBucket: varchar("storage_bucket", { length: 100 }),
    storagePath: text("storage_path"),
    documentHash: varchar("document_hash", { length: 128 }),
    version: integer().default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_iso_generated_at").using(
      "btree",
      table.generatedAt.asc().nullsLast().op("timestamptz_ops"),
    ),
    foreignKey({
      columns: [table.borrowRequestId],
      foreignColumns: [borrowRequests.id],
      name: "iso_requisitions_borrow_request_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.generatedBy],
      foreignColumns: [users.id],
      name: "iso_requisitions_generated_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    unique("iso_requisitions_borrow_request_id_key").on(table.borrowRequestId),
    unique("iso_requisitions_form_number_key").on(table.formNumber),
    check("chk_iso_version", sql`version > 0`),
  ],
);

export const borrowRequestStatusHistory = pgTable(
  "borrow_request_status_history",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    borrowRequestId: uuid("borrow_request_id").notNull(),
    previousStatus: borrowRequestStatus("previous_status"),
    newStatus: borrowRequestStatus("new_status").notNull(),
    changedBy: uuid("changed_by"),
    remarks: text(),
    changedAt: timestamp("changed_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_status_history_request_date").using(
      "btree",
      table.borrowRequestId.asc().nullsLast().op("timestamptz_ops"),
      table.changedAt.desc().nullsFirst().op("timestamptz_ops"),
    ),
    foreignKey({
      columns: [table.borrowRequestId],
      foreignColumns: [borrowRequests.id],
      name: "borrow_request_status_history_borrow_request_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
    foreignKey({
      columns: [table.changedBy],
      foreignColumns: [users.id],
      name: "borrow_request_status_history_changed_by_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    notificationType: varchar("notification_type", { length: 60 }).notNull(),
    title: varchar({ length: 150 }).notNull(),
    message: text().notNull(),
    relatedEntityType: varchar("related_entity_type", { length: 60 }),
    relatedEntityId: uuid("related_entity_id"),
    readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_notifications_unread")
      .using("btree", table.userId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(read_at IS NULL)`),
    index("idx_notifications_user_created").using(
      "btree",
      table.userId.asc().nullsLast().op("timestamptz_ops"),
      table.createdAt.desc().nullsFirst().op("timestamptz_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "notifications_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    actorUserId: uuid("actor_user_id"),
    action: varchar({ length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_audit_actor_date").using(
      "btree",
      table.actorUserId.asc().nullsLast().op("timestamptz_ops"),
      table.createdAt.desc().nullsFirst().op("timestamptz_ops"),
    ),
    index("idx_audit_entity").using(
      "btree",
      table.entityType.asc().nullsLast().op("text_ops"),
      table.entityId.asc().nullsLast().op("text_ops"),
    ),
    foreignKey({
      columns: [table.actorUserId],
      foreignColumns: [users.id],
      name: "audit_logs_actor_user_id_fkey",
    })
      .onUpdate("cascade")
      .onDelete("restrict"),
  ],
);
export const vwEquipmentAssetAvailability = pgView(
  "vw_equipment_asset_availability",
  {
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
    availabilityStatus: text("availability_status"),
  },
).as(
  sql`SELECT ea.id AS equipment_asset_id, ea.asset_code, ea.qr_token, ea.serial_number, ec.id AS equipment_catalog_id, ec.equipment_name, category.id AS category_id, category.name AS category_name, ea.current_condition, ea.operational_status, CASE WHEN ea.archived_at IS NOT NULL THEN 'archived'::text WHEN ea.operational_status = 'maintenance'::equipment_operational_status THEN 'maintenance'::text WHEN ea.operational_status = 'damaged'::equipment_operational_status THEN 'damaged'::text WHEN ea.operational_status = 'retired'::equipment_operational_status THEN 'retired'::text WHEN (EXISTS ( SELECT 1 FROM borrow_allocations ba WHERE ba.equipment_asset_id = ea.id AND ba.allocation_status = 'released'::allocation_status)) THEN 'borrowed'::text WHEN (EXISTS ( SELECT 1 FROM borrow_allocations ba WHERE ba.equipment_asset_id = ea.id AND ba.allocation_status = 'reserved'::allocation_status AND ba.reservation_period @> now())) THEN 'reserved'::text ELSE 'available'::text END AS availability_status FROM equipment_assets ea JOIN equipment_catalog ec ON ec.id = ea.equipment_catalog_id JOIN equipment_categories category ON category.id = ec.category_id`,
);

export const vwEquipmentInventorySummary = pgView(
  "vw_equipment_inventory_summary",
  {
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
    retiredUnits: bigint("retired_units", { mode: "number" }),
  },
).as(
  sql`SELECT equipment_catalog_id, equipment_name, category_id, category_name, count(*) FILTER (WHERE availability_status <> 'archived'::text) AS total_units, count(*) FILTER (WHERE availability_status = 'available'::text) AS available_units, count(*) FILTER (WHERE availability_status = 'reserved'::text) AS reserved_units, count(*) FILTER (WHERE availability_status = 'borrowed'::text) AS borrowed_units, count(*) FILTER (WHERE availability_status = 'maintenance'::text) AS maintenance_units, count(*) FILTER (WHERE availability_status = 'damaged'::text) AS damaged_units, count(*) FILTER (WHERE availability_status = 'retired'::text) AS retired_units FROM vw_equipment_asset_availability GROUP BY equipment_catalog_id, equipment_name, category_id, category_name`,
);

export const vwCurrentCustody = pgView("vw_current_custody", {
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
  isOverdue: boolean("is_overdue"),
}).as(
  sql`SELECT ba.id AS allocation_id, br.id AS borrow_request_id, br.request_number, u.id AS borrower_id, u.institutional_id, concat_ws(' '::text, u.first_name, u.middle_name, u.last_name) AS borrower_name, ea.id AS equipment_asset_id, ea.asset_code, ec.id AS equipment_catalog_id, ec.equipment_name, ba.released_at, br.requested_due_at AS due_at, ba.release_condition, br.requested_due_at < now() AS is_overdue FROM borrow_allocations ba JOIN borrow_request_items bri ON bri.id = ba.borrow_request_item_id JOIN borrow_requests br ON br.id = bri.borrow_request_id JOIN users u ON u.id = br.borrower_id JOIN equipment_assets ea ON ea.id = ba.equipment_asset_id JOIN equipment_catalog ec ON ec.id = ea.equipment_catalog_id WHERE ba.allocation_status = 'released'::allocation_status`,
);

export const vwOverdueLoans = pgView("vw_overdue_loans", {
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
  releaseCondition: equipmentCondition("release_condition"),
}).as(
  sql`SELECT allocation_id, borrow_request_id, request_number, borrower_id, institutional_id, borrower_name, equipment_asset_id, asset_code, equipment_catalog_id, equipment_name, released_at, due_at, now() - due_at AS overdue_duration, release_condition FROM vw_current_custody WHERE due_at < now()`,
);

export const vwAccountabilityRecords = pgView("vw_accountability_records", {
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
  processedBy: uuid("processed_by"),
}).as(
  sql`SELECT rr.id AS return_record_id, br.id AS borrow_request_id, br.request_number, u.id AS borrower_id, u.institutional_id, concat_ws(' '::text, u.first_name, u.middle_name, u.last_name) AS borrower_name, ea.id AS equipment_asset_id, ea.asset_code, ec.equipment_name, ba.release_condition AS condition_before, rr.condition_after, rr.outcome, ba.released_at, br.requested_due_at AS due_at, rr.returned_at, rr.returned_at > br.requested_due_at AS was_returned_late, rr.remarks, rr.processed_by FROM return_records rr JOIN borrow_allocations ba ON ba.id = rr.allocation_id JOIN borrow_request_items bri ON bri.id = ba.borrow_request_item_id JOIN borrow_requests br ON br.id = bri.borrow_request_id JOIN users u ON u.id = br.borrower_id JOIN equipment_assets ea ON ea.id = ba.equipment_asset_id JOIN equipment_catalog ec ON ec.id = ea.equipment_catalog_id`,
);

export const vwBorrowingTrendsMonthly = pgView("vw_borrowing_trends_monthly", {
  month: timestamp({ withTimezone: true, mode: "string" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalRequests: bigint("total_requests", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  rejectedRequests: bigint("rejected_requests", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  cancelledRequests: bigint("cancelled_requests", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  acceptedRequests: bigint("accepted_requests", { mode: "number" }),
}).as(
  sql`SELECT date_trunc('month'::text, submitted_at) AS month, count(*) AS total_requests, count(*) FILTER (WHERE status = 'rejected'::borrow_request_status) AS rejected_requests, count(*) FILTER (WHERE status = 'cancelled'::borrow_request_status) AS cancelled_requests, count(*) FILTER (WHERE status = ANY (ARRAY['approved'::borrow_request_status, 'ready_for_release'::borrow_request_status, 'borrowed'::borrow_request_status, 'partially_returned'::borrow_request_status, 'returned'::borrow_request_status])) AS accepted_requests FROM borrow_requests WHERE submitted_at IS NOT NULL GROUP BY (date_trunc('month'::text, submitted_at))`,
);

export const vwEquipmentUsage = pgView("vw_equipment_usage", {
  equipmentCatalogId: uuid("equipment_catalog_id"),
  equipmentName: varchar("equipment_name", { length: 150 }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalBorrowCount: bigint("total_borrow_count", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  uniqueAssetsUsed: bigint("unique_assets_used", { mode: "number" }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "string" }),
}).as(
  sql`SELECT ec.id AS equipment_catalog_id, ec.equipment_name, count(ba.id) FILTER (WHERE ba.released_at IS NOT NULL) AS total_borrow_count, count(DISTINCT ba.equipment_asset_id) FILTER (WHERE ba.released_at IS NOT NULL) AS unique_assets_used, max(ba.released_at) AS last_used_at FROM equipment_catalog ec LEFT JOIN equipment_assets ea ON ea.equipment_catalog_id = ec.id LEFT JOIN borrow_allocations ba ON ba.equipment_asset_id = ea.id GROUP BY ec.id, ec.equipment_name`,
);

export const vwInventoryUtilization = pgView("vw_inventory_utilization", {
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
  currentUtilizationPercent: numeric("current_utilization_percent"),
}).as(
  sql`SELECT equipment_catalog_id, equipment_name, category_name, total_units, available_units, reserved_units, borrowed_units, maintenance_units, damaged_units, retired_units, round(borrowed_units::numeric / NULLIF(total_units - maintenance_units - damaged_units - retired_units, 0)::numeric * 100::numeric, 2) AS current_utilization_percent FROM vw_equipment_inventory_summary`,
);

export const vwUserBorrowingFrequency = pgView("vw_user_borrowing_frequency", {
  userId: uuid("user_id"),
  institutionalId: varchar("institutional_id", { length: 50 }),
  userName: text("user_name"),
  personType: personType("person_type"),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalRequests: bigint("total_requests", { mode: "number" }),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalAssetsBorrowed: bigint("total_assets_borrowed", { mode: "number" }),
}).as(
  sql`SELECT u.id AS user_id, u.institutional_id, concat_ws(' '::text, u.first_name, u.middle_name, u.last_name) AS user_name, u.person_type, count(DISTINCT br.id) FILTER (WHERE br.submitted_at IS NOT NULL) AS total_requests, count(ba.id) FILTER (WHERE ba.released_at IS NOT NULL) AS total_assets_borrowed FROM users u LEFT JOIN borrow_requests br ON br.borrower_id = u.id LEFT JOIN borrow_request_items bri ON bri.borrow_request_id = br.id LEFT JOIN borrow_allocations ba ON ba.borrow_request_item_id = bri.id WHERE u.role = 'student_faculty'::user_role GROUP BY u.id, u.institutional_id, u.first_name, u.middle_name, u.last_name, u.person_type`,
);

export const vwCollegeBorrowingFrequency = pgView(
  "vw_college_borrowing_frequency",
  {
    collegeId: uuid("college_id"),
    collegeCode: varchar("college_code", { length: 30 }),
    collegeName: varchar("college_name", { length: 150 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalRequests: bigint("total_requests", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalAssetsBorrowed: bigint("total_assets_borrowed", { mode: "number" }),
  },
).as(
  sql`SELECT college.id AS college_id, college.code AS college_code, college.name AS college_name, count(DISTINCT br.id) FILTER (WHERE br.submitted_at IS NOT NULL) AS total_requests, count(ba.id) FILTER (WHERE ba.released_at IS NOT NULL) AS total_assets_borrowed FROM colleges college LEFT JOIN users u ON u.college_id = college.id LEFT JOIN borrow_requests br ON br.borrower_id = u.id LEFT JOIN borrow_request_items bri ON bri.borrow_request_id = br.id LEFT JOIN borrow_allocations ba ON ba.borrow_request_item_id = bri.id GROUP BY college.id, college.code, college.name`,
);

export const vwCourseBorrowingFrequency = pgView(
  "vw_course_borrowing_frequency",
  {
    courseId: uuid("course_id"),
    courseCode: varchar("course_code", { length: 30 }),
    courseName: varchar("course_name", { length: 150 }),
    collegeId: uuid("college_id"),
    collegeName: varchar("college_name", { length: 150 }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalRequests: bigint("total_requests", { mode: "number" }),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    totalAssetsBorrowed: bigint("total_assets_borrowed", { mode: "number" }),
  },
).as(
  sql`SELECT course.id AS course_id, course.code AS course_code, course.name AS course_name, college.id AS college_id, college.name AS college_name, count(DISTINCT br.id) FILTER (WHERE br.submitted_at IS NOT NULL) AS total_requests, count(ba.id) FILTER (WHERE ba.released_at IS NOT NULL) AS total_assets_borrowed FROM courses course JOIN colleges college ON college.id = course.college_id LEFT JOIN users u ON u.course_id = course.id LEFT JOIN borrow_requests br ON br.borrower_id = u.id LEFT JOIN borrow_request_items bri ON bri.borrow_request_id = br.id LEFT JOIN borrow_allocations ba ON ba.borrow_request_item_id = bri.id GROUP BY course.id, course.code, course.name, college.id, college.name`,
);

export const vwPeakBorrowingPeriods = pgView("vw_peak_borrowing_periods", {
  dayOfWeek: integer("day_of_week"),
  dayName: text("day_name"),
  hourOfDay: integer("hour_of_day"),
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  totalAssetsReleased: bigint("total_assets_released", { mode: "number" }),
}).as(
  sql`SELECT EXTRACT(isodow FROM released_at)::integer AS day_of_week, TRIM(BOTH FROM to_char(released_at, 'Day'::text)) AS day_name, EXTRACT(hour FROM released_at)::integer AS hour_of_day, count(*) AS total_assets_released FROM borrow_allocations WHERE released_at IS NOT NULL GROUP BY (EXTRACT(isodow FROM released_at)), (TRIM(BOTH FROM to_char(released_at, 'Day'::text))), (EXTRACT(hour FROM released_at))`,
);

export const vwEquipmentQrLookup = pgView("vw_equipment_qr_lookup", {
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
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
}).as(
  sql`SELECT ea.id AS equipment_asset_id, ea.qr_token, ea.asset_code, ea.serial_number, ec.id AS equipment_catalog_id, ec.equipment_name, category.id AS category_id, category.name AS category_name, department.id AS department_id, department.name AS department_name, ea.current_condition, ea.operational_status, ea.archived_at FROM equipment_assets ea JOIN equipment_catalog ec ON ec.id = ea.equipment_catalog_id JOIN equipment_categories category ON category.id = ec.category_id LEFT JOIN departments department ON department.id = ea.department_id`,
);
