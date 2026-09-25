type AuditRole = "admin" | "student_faculty" | "super_admin";

export function auditScope(viewerRole: "admin" | "super_admin", requestedRole?: AuditRole) {
  if (viewerRole === "admin") return { visibleRole: "student_faculty" as const, deny: Boolean(requestedRole && requestedRole !== "student_faculty") };
  return { visibleRole: requestedRole, deny: false };
}
