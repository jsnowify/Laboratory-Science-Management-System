import { z } from "zod";

const name = z.string().trim().min(1).max(100);
const email = z.email().max(255).transform((value) => value.toLowerCase());
export const strongPassword = z.string()
  .min(12, "Use at least 12 characters.")
  .max(128)
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[0-9]/, "Add a number.")
  .regex(/[^A-Za-z0-9]/, "Add a special character.");

export const identityInput = z.object({
  institutionalId: z.string().trim().min(2).max(50),
  firstName: name,
  middleName: z.string().trim().max(100).optional(),
  lastName: name,
  email,
  password: strongPassword,
});

export const setupInput = identityInput.extend({
  password: z.string().min(10).max(128),
  setupToken: z.string().min(1),
});
export const staffInput = identityInput.extend({ departmentId: z.uuid().optional() });
export const registrationInput = identityInput.extend({
  personType: z.enum(["student", "faculty"]),
  collegeId: z.uuid(),
  courseId: z.uuid().optional(),
}).refine((value) => value.personType !== "student" || Boolean(value.courseId), {
  path: ["courseId"], message: "A course is required for students.",
});

export const organizationInput = z.object({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(150),
});
export const departmentInput = organizationInput.extend({ code: z.string().trim().max(30).optional() });
export const courseInput = organizationInput.extend({ collegeId: z.uuid() });
export const uuidParam = z.object({ id: z.uuid() });
export const listQuery = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const organizationListQuery = listQuery.extend({
  includeInactive: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
});
export const organizationUpdate = organizationInput.partial().extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field.");
export const courseUpdate = courseInput.partial().extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field.");
export const departmentUpdate = departmentInput.partial().extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field.");
export const userListQuery = listQuery.extend({
  status: z.enum(["pending", "active", "suspended", "archived"]).optional(),
});
export const userStatusInput = z.object({ status: z.enum(["active", "suspended", "archived"]) });
export const categoryInput = z.object({ name: z.string().trim().min(1).max(100), description: z.string().trim().max(2000).optional() });
export const categoryUpdate = categoryInput.partial().extend({ isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
export const catalogInput = z.object({
  categoryId: z.uuid(), equipmentName: z.string().trim().min(1).max(150),
  description: z.string().trim().max(4000).optional(), manufacturer: z.string().trim().max(150).optional(),
  model: z.string().trim().max(150).optional(), unitOfMeasure: z.string().trim().min(1).max(50).default("unit"),
});
export const catalogUpdate = catalogInput.partial().extend({ isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
export const assetInput = z.object({
  equipmentCatalogId: z.uuid(), assetCode: z.string().trim().min(1).max(50),
  serialNumber: z.string().trim().max(100).optional(), departmentId: z.uuid().optional(),
  currentCondition: z.enum(["excellent", "good", "fair", "damaged"]).default("good"),
  operationalStatus: z.enum(["active", "maintenance", "damaged", "retired"]).default("active"),
  acquisitionDate: z.iso.date().optional(), notes: z.string().trim().max(4000).optional(),
});
export const assetUpdate = assetInput.partial().extend({ archive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0);
export const equipmentListQuery = listQuery.extend({
  categoryId: z.uuid().optional(), catalogId: z.uuid().optional(),
  includeInactive: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
});
const scheduledAt = z.iso.datetime({ offset: true });
export const borrowRequestInput = z.object({
  purpose: z.string().trim().min(5).max(4000),
  requestedBorrowAt: scheduledAt,
  requestedDueAt: scheduledAt,
  items: z.array(z.object({ equipmentCatalogId: z.uuid(), quantityRequested: z.number().int().min(1).max(100) })).min(1).max(20),
}).refine((value) => Date.parse(value.requestedDueAt) > Date.parse(value.requestedBorrowAt), { path: ["requestedDueAt"], message: "Due date must be after the borrow date." })
  .refine((value) => new Set(value.items.map((item) => item.equipmentCatalogId)).size === value.items.length, { path: ["items"], message: "Each equipment type can appear once." });
export const rejectionInput = z.object({ reason: z.string().trim().min(5).max(2000), notes: z.string().trim().max(2000).optional() });
export const reviewInput = z.object({ notes: z.string().trim().max(2000).optional() });
export const approvalInput = z.object({
  items: z.array(z.object({ itemId: z.uuid(), quantityApproved: z.number().int().min(0) })).min(1),
  notes: z.string().trim().max(2000).optional(),
}).refine((value) => value.items.some((item) => item.quantityApproved > 0), { path: ["items"], message: "Approve at least one unit." });
export const allocationInput = z.object({ itemId: z.uuid(), assetId: z.uuid() });
export const releaseInput = z.object({
  allocations: z.array(z.object({ allocationId: z.uuid(), condition: z.enum(["excellent", "good", "fair", "damaged"]), notes: z.string().trim().max(2000).optional() })).min(1),
}).refine((value) => new Set(value.allocations.map((item) => item.allocationId)).size === value.allocations.length, { path: ["allocations"], message: "Each allocation can appear once." });
export const returnInput = z.object({
  allocationId: z.uuid(), conditionAfter: z.enum(["excellent", "good", "fair", "damaged"]),
  outcome: z.enum(["normal", "damaged", "maintenance_required"]),
  remarks: z.string().trim().max(2000).optional(),
}).refine((value) => value.outcome === "normal" || Boolean(value.remarks), { path: ["remarks"], message: "Add remarks for damage or maintenance." })
  .refine((value) => value.conditionAfter !== "damaged" || value.outcome === "damaged", { path: ["outcome"], message: "A damaged condition requires a damaged outcome." });
export const borrowListQuery = listQuery.extend({ status: z.enum(["draft", "submitted", "under_review", "approved", "rejected", "ready_for_release", "borrowed", "partially_returned", "returned", "cancelled"]).optional() });
