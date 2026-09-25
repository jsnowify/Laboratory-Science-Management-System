import { relations } from "drizzle-orm/relations";
import {
  colleges,
  courses,
  users,
  departments,
  equipmentCategories,
  equipmentCatalog,
  equipmentAssets,
  borrowRequests,
  borrowRequestItems,
  borrowAllocations,
  returnRecords,
  isoRequisitions,
  borrowRequestStatusHistory,
  notifications,
  auditLogs,
} from "./schema";

export const coursesRelations = relations(courses, ({ one, many }) => ({
  college: one(colleges, {
    fields: [courses.collegeId],
    references: [colleges.id],
  }),
  users: many(users),
}));

export const collegesRelations = relations(colleges, ({ many }) => ({
  courses: many(courses),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  college: one(colleges, {
    fields: [users.collegeId],
    references: [colleges.id],
  }),
  course: one(courses, {
    fields: [users.courseId],
    references: [courses.id],
  }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  borrowRequests_borrowerId: many(borrowRequests, {
    relationName: "borrowRequests_borrowerId_users_id",
  }),
  borrowRequests_reviewedBy: many(borrowRequests, {
    relationName: "borrowRequests_reviewedBy_users_id",
  }),
  borrowAllocations_allocatedBy: many(borrowAllocations, {
    relationName: "borrowAllocations_allocatedBy_users_id",
  }),
  borrowAllocations_releasedBy: many(borrowAllocations, {
    relationName: "borrowAllocations_releasedBy_users_id",
  }),
  returnRecords: many(returnRecords),
  isoRequisitions: many(isoRequisitions),
  borrowRequestStatusHistories: many(borrowRequestStatusHistory),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  equipmentAssets: many(equipmentAssets),
}));

export const equipmentCatalogRelations = relations(
  equipmentCatalog,
  ({ one, many }) => ({
    equipmentCategory: one(equipmentCategories, {
      fields: [equipmentCatalog.categoryId],
      references: [equipmentCategories.id],
    }),
    equipmentAssets: many(equipmentAssets),
    borrowRequestItems: many(borrowRequestItems),
  }),
);

export const equipmentCategoriesRelations = relations(
  equipmentCategories,
  ({ many }) => ({
    equipmentCatalogs: many(equipmentCatalog),
  }),
);

export const equipmentAssetsRelations = relations(
  equipmentAssets,
  ({ one, many }) => ({
    equipmentCatalog: one(equipmentCatalog, {
      fields: [equipmentAssets.equipmentCatalogId],
      references: [equipmentCatalog.id],
    }),
    department: one(departments, {
      fields: [equipmentAssets.departmentId],
      references: [departments.id],
    }),
    borrowAllocations: many(borrowAllocations),
  }),
);

export const borrowRequestsRelations = relations(
  borrowRequests,
  ({ one, many }) => ({
    user_borrowerId: one(users, {
      fields: [borrowRequests.borrowerId],
      references: [users.id],
      relationName: "borrowRequests_borrowerId_users_id",
    }),
    user_reviewedBy: one(users, {
      fields: [borrowRequests.reviewedBy],
      references: [users.id],
      relationName: "borrowRequests_reviewedBy_users_id",
    }),
    borrowRequestItems: many(borrowRequestItems),
    isoRequisitions: many(isoRequisitions),
    borrowRequestStatusHistories: many(borrowRequestStatusHistory),
  }),
);

export const borrowRequestItemsRelations = relations(
  borrowRequestItems,
  ({ one, many }) => ({
    borrowRequest: one(borrowRequests, {
      fields: [borrowRequestItems.borrowRequestId],
      references: [borrowRequests.id],
    }),
    equipmentCatalog: one(equipmentCatalog, {
      fields: [borrowRequestItems.equipmentCatalogId],
      references: [equipmentCatalog.id],
    }),
    borrowAllocations: many(borrowAllocations),
  }),
);

export const borrowAllocationsRelations = relations(
  borrowAllocations,
  ({ one, many }) => ({
    borrowRequestItem: one(borrowRequestItems, {
      fields: [borrowAllocations.borrowRequestItemId],
      references: [borrowRequestItems.id],
    }),
    equipmentAsset: one(equipmentAssets, {
      fields: [borrowAllocations.equipmentAssetId],
      references: [equipmentAssets.id],
    }),
    user_allocatedBy: one(users, {
      fields: [borrowAllocations.allocatedBy],
      references: [users.id],
      relationName: "borrowAllocations_allocatedBy_users_id",
    }),
    user_releasedBy: one(users, {
      fields: [borrowAllocations.releasedBy],
      references: [users.id],
      relationName: "borrowAllocations_releasedBy_users_id",
    }),
    returnRecords: many(returnRecords),
  }),
);

export const returnRecordsRelations = relations(returnRecords, ({ one }) => ({
  borrowAllocation: one(borrowAllocations, {
    fields: [returnRecords.allocationId],
    references: [borrowAllocations.id],
  }),
  user: one(users, {
    fields: [returnRecords.processedBy],
    references: [users.id],
  }),
}));

export const isoRequisitionsRelations = relations(
  isoRequisitions,
  ({ one }) => ({
    borrowRequest: one(borrowRequests, {
      fields: [isoRequisitions.borrowRequestId],
      references: [borrowRequests.id],
    }),
    user: one(users, {
      fields: [isoRequisitions.generatedBy],
      references: [users.id],
    }),
  }),
);

export const borrowRequestStatusHistoryRelations = relations(
  borrowRequestStatusHistory,
  ({ one }) => ({
    borrowRequest: one(borrowRequests, {
      fields: [borrowRequestStatusHistory.borrowRequestId],
      references: [borrowRequests.id],
    }),
    user: one(users, {
      fields: [borrowRequestStatusHistory.changedBy],
      references: [users.id],
    }),
  }),
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));
