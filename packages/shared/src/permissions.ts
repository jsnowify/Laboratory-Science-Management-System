export const roles = ["super_admin", "admin", "student_faculty"] as const;
export type Role = (typeof roles)[number];

export const permissions = {
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
  "accountability.read_own": ["student_faculty"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof permissions;

export function can(role: Role, permission: Permission) {
  return (permissions[permission] as readonly Role[]).includes(role);
}
