import { describe, expect, it } from "vitest";
import { can } from "./permissions";

describe("role permissions", () => {
  it("keeps borrowing approval exclusive to super admin", () => {
    expect(can("super_admin", "borrowing.approve")).toBe(true);
    expect(can("admin", "borrowing.approve")).toBe(false);
    expect(can("student_faculty", "borrowing.approve")).toBe(false);
  });
});
