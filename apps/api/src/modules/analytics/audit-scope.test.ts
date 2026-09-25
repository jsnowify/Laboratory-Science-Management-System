import { describe, expect, it } from "vitest";
import { auditScope } from "./audit-scope";

describe("audit role scope", () => {
  it("limits Admin to student and faculty events even when a different role is requested", () => {
    expect(auditScope("admin")).toEqual({
      visibleRole: "student_faculty",
      deny: false,
    });
    expect(auditScope("admin", "student_faculty")).toEqual({
      visibleRole: "student_faculty",
      deny: false,
    });
    expect(auditScope("admin", "super_admin")).toEqual({
      visibleRole: "student_faculty",
      deny: true,
    });
    expect(auditScope("admin", "admin")).toEqual({
      visibleRole: "student_faculty",
      deny: true,
    });
  });
  it("allows Super Admin to view all roles or filter one", () => {
    expect(auditScope("super_admin")).toEqual({
      visibleRole: undefined,
      deny: false,
    });
    expect(auditScope("super_admin", "admin")).toEqual({
      visibleRole: "admin",
      deny: false,
    });
  });
});
