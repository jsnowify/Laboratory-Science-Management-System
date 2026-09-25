import { describe, expect, it } from "vitest";
import { can } from "./permissions";
import { profileUpdateInput } from "./schemas";

describe("role permissions", () => {
  it("keeps borrowing approval exclusive to super admin", () => {
    expect(can("super_admin", "borrowing.approve")).toBe(true);
    expect(can("admin", "borrowing.approve")).toBe(false);
    expect(can("student_faculty", "borrowing.approve")).toBe(false);
  });
  it("allows both staff roles to read analytics", () => {
    expect(can("admin", "analytics.read")).toBe(true);
    expect(can("super_admin", "analytics.read")).toBe(true);
    expect(can("student_faculty", "analytics.read")).toBe(false);
  });
  it("allows Admin to read the scoped audit log while borrowers cannot", () => {
    expect(can("super_admin", "audit.read")).toBe(true);
    expect(can("admin", "audit.read")).toBe(true);
    expect(can("student_faculty", "audit.read")).toBe(false);
  });
  it("reserves management of every account for super admin", () => {
    expect(can("super_admin", "users.manage_all")).toBe(true);
    expect(can("admin", "users.manage_all")).toBe(false);
    expect(can("student_faculty", "users.manage_all")).toBe(false);
  });
  it("rejects attempts to change role or affiliation through profile updates", () => {
    const details = { firstName: "Test", middleName: "", lastName: "Borrower", email: "test@example.edu" };
    expect(profileUpdateInput.safeParse(details).success).toBe(true);
    expect(profileUpdateInput.safeParse({ ...details, personType: "faculty" }).success).toBe(false);
    expect(profileUpdateInput.safeParse({ ...details, role: "super_admin" }).success).toBe(false);
    expect(profileUpdateInput.safeParse({ ...details, institutionalId: "OTHER-001" }).success).toBe(false);
  });
});
