import { describe, expect, it } from "vitest";
import { canSetStatus } from "./account-rules";

describe("account status transitions", () => {
  it("requires activation before a pending account can be suspended", () => {
    expect(canSetStatus("pending", "suspended")).toBe(false);
    expect(canSetStatus("pending", "active")).toBe(true);
  });
  it("keeps archived accounts archived", () => {
    expect(canSetStatus("archived", "active")).toBe(false);
    expect(canSetStatus("archived", "suspended")).toBe(false);
  });
});
