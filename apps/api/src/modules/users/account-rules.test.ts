import { describe, expect, it } from "vitest";
import {
  canAdminChangeStatus,
  canSetStatus,
  canSuperAdminChangeStatus,
} from "./account-rules";

describe("account status transitions", () => {
  it("requires activation before a pending account can be suspended", () => {
    expect(canSetStatus("pending", "suspended")).toBe(false);
    expect(canSetStatus("pending", "active")).toBe(true);
    expect(canSetStatus("pending", "archived")).toBe(true);
  });
  it("keeps archived accounts archived", () => {
    expect(canSetStatus("archived", "active")).toBe(false);
    expect(canSetStatus("archived", "suspended")).toBe(false);
  });
});

describe("Super Admin account permissions", () => {
  it("can manage other account roles without disabling their own or the last active Super Admin", () => {
    expect(
      canSuperAdminChangeStatus("admin", "active", "suspended", false, true),
    ).toBe(true);
    expect(
      canSuperAdminChangeStatus(
        "student_faculty",
        "pending",
        "active",
        false,
        true,
      ),
    ).toBe(true);
    expect(
      canSuperAdminChangeStatus(
        "student_faculty",
        "pending",
        "archived",
        false,
        true,
      ),
    ).toBe(true);
    expect(
      canSuperAdminChangeStatus(
        "super_admin",
        "active",
        "suspended",
        false,
        true,
      ),
    ).toBe(true);
    expect(
      canSuperAdminChangeStatus(
        "super_admin",
        "active",
        "suspended",
        true,
        true,
      ),
    ).toBe(false);
    expect(
      canSuperAdminChangeStatus(
        "super_admin",
        "active",
        "archived",
        false,
        false,
      ),
    ).toBe(false);
  });
});

describe("Admin account permissions", () => {
  it("allows only pending student or faculty activation", () => {
    expect(canAdminChangeStatus("student_faculty", "pending", "active")).toBe(
      true,
    );
    expect(canAdminChangeStatus("student_faculty", "active", "suspended")).toBe(
      false,
    );
    expect(canAdminChangeStatus("student_faculty", "active", "archived")).toBe(
      false,
    );
    expect(canAdminChangeStatus("admin", "pending", "active")).toBe(false);
    expect(canAdminChangeStatus("admin", "active", "suspended")).toBe(false);
  });
});
