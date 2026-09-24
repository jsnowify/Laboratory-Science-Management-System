import { describe, expect, it } from "vitest";
import { canCancelRequest, returnRequestStatus, validApproval } from "./rules";

describe("borrowing rules", () => {
  it("prevents cancellation after review begins", () => {
    expect(canCancelRequest("submitted")).toBe(true);
    expect(canCancelRequest("under_review")).toBe(false);
    expect(canCancelRequest("borrowed")).toBe(false);
  });
  it("rejects approval above the requested quantity", () => {
    expect(validApproval(2, 3)).toBe(false);
    expect(validApproval(2, 0)).toBe(true);
  });
  it("tracks partial and complete returns", () => {
    expect(returnRequestStatus(3, 1)).toBe("partially_returned");
    expect(returnRequestStatus(3, 3)).toBe("returned");
  });
});
