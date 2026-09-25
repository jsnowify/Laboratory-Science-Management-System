import { describe, expect, it } from "vitest";
import {
  auditActionLabel,
  auditDetails,
  auditRecordLabel,
} from "./audit-presentation";

describe("audit presentation", () => {
  it("turns account changes into plain language without exposing identifiers", () => {
    expect(auditActionLabel("user.suspended")).toBe("Account suspended");
    expect(auditRecordLabel("users", "Maria Santos")).toBe(
      "Account: Maria Santos",
    );
    expect(
      auditDetails({
        previousStatus: "active",
        newStatus: "suspended",
        targetInstitutionalId: "STUDENT-123",
        targetRole: "student_faculty",
      }),
    ).toBe("Status changed from active to suspended.");
    expect(
      auditDetails({
        changedFields: ["firstName", "email"],
        targetInstitutionalId: "STUDENT-123",
      }),
    ).toBe("Updated first name, email address.");
  });
});
