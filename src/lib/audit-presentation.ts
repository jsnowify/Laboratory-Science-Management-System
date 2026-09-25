const actionLabels: Record<string, string> = {
  first_super_admin_created: "First Super Admin account created",
  student_faculty_registered: "Student or faculty account registered",
  "admin.created": "Admin account created",
  "user.pending": "Account set to pending review",
  "user.active": "Account activated",
  "user.suspended": "Account suspended",
  "user.archived": "Account archived",
  "profile.updated": "Profile details updated",
  "user.profile_updated": "Account details updated",
  "profile.password_changed": "Password changed",
  "college.created": "College added",
  "college.updated": "College updated",
  "college.deactivated": "College deactivated",
  "course.created": "Course added",
  "course.updated": "Course updated",
  "course.deactivated": "Course deactivated",
  "department.created": "Department added",
  "department.updated": "Department updated",
  "department.deactivated": "Department deactivated",
  "equipment_category.created": "Equipment category added",
  "equipment_category.updated": "Equipment category updated",
  "equipment_catalog.created": "Equipment type added",
  "equipment_catalog.updated": "Equipment type updated",
  "equipment_asset.created": "Physical asset added",
  "equipment_asset.updated": "Physical asset updated",
  "equipment_asset.archived": "Physical asset archived",
  "equipment_asset.allocated": "Equipment reserved for a request",
  "equipment.released": "Equipment released to borrower",
  "equipment.returned": "Equipment return recorded",
  "borrow_request.draft_created": "Borrowing request draft created",
  "borrow_request.draft_updated": "Borrowing request draft updated",
  "borrow_request.submitted": "Borrowing request submitted",
  "borrow_request.cancelled": "Borrowing request cancelled",
  "borrow_request.review_started": "Borrowing request review started",
  "borrow_request.approved": "Borrowing request approved",
  "borrow_request.rejected": "Borrowing request rejected",
  "iso_requisition.generated": "Requisition form generated",
  "iso_requisition.released": "Requisition form released",
};

const recordLabels: Record<string, string> = {
  users: "Account",
  colleges: "College",
  courses: "Course",
  departments: "Department",
  equipment_categories: "Equipment category",
  equipment_catalog: "Equipment type",
  equipment_assets: "Physical asset",
  borrow_requests: "Borrowing request",
  borrow_allocations: "Equipment allocation",
  return_records: "Return",
  iso_requisitions: "Requisition form",
};

export function auditActionLabel(action: string) {
  return (
    actionLabels[action] ??
    action
      .replaceAll(/[._]/g, " ")
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}

export function auditRoleLabel(role: string | null) {
  return (
    (
      {
        admin: "Admin",
        super_admin: "Super Admin",
        student_faculty: "Student / Faculty",
      } as Record<string, string>
    )[role ?? ""] ?? "System"
  );
}

export function auditRecordLabel(type: string, targetLabel?: string | null) {
  const label = recordLabels[type] ?? "Record";
  return targetLabel
    ? `${label}: ${targetLabel}`
    : `${label} (no longer available)`;
}

const fieldLabels: Record<string, string> = {
  firstName: "first name",
  middleName: "middle name",
  lastName: "last name",
  email: "email address",
};

export function auditDetails(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return "";
  const values = metadata as Record<string, unknown>;
  const parts: string[] = [];
  if (
    typeof values.previousStatus === "string" &&
    typeof values.newStatus === "string"
  )
    parts.push(
      `Status changed from ${values.previousStatus.replaceAll("_", " ")} to ${values.newStatus.replaceAll("_", " ")}.`,
    );
  if (Array.isArray(values.changedFields)) {
    const fields = values.changedFields
      .filter((field): field is string => typeof field === "string")
      .map((field) => fieldLabels[field])
      .filter(Boolean);
    if (fields.length) parts.push(`Updated ${fields.join(", ")}.`);
  }
  if (typeof values.personType === "string")
    parts.push(`Affiliation: ${values.personType}.`);
  if (typeof values.outcome === "string")
    parts.push(`Return outcome: ${values.outcome.replaceAll("_", " ")}.`);
  return parts.join(" ");
}
