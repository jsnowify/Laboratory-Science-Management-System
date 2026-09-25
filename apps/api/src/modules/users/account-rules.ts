export type Status = "pending" | "active" | "suspended" | "archived";

export function canSetStatus(from: Status, to: Status) {
  return (
    (from === "pending" && (to === "active" || to === "archived")) ||
    (from === "active" && (to === "suspended" || to === "archived")) ||
    (from === "suspended" && (to === "active" || to === "archived"))
  );
}

export function canAdminChangeStatus(role: string, from: Status, to: Status) {
  return role === "student_faculty" && from === "pending" && to === "active";
}

export function canSuperAdminChangeStatus(
  targetRole: string,
  from: Status,
  to: Status,
  isSelf: boolean,
  hasOtherActiveSuperAdmin: boolean,
) {
  return (
    canSetStatus(from, to) &&
    !(isSelf && to !== "active") &&
    !(
      targetRole === "super_admin" &&
      from === "active" &&
      to !== "active" &&
      !hasOtherActiveSuperAdmin
    )
  );
}
