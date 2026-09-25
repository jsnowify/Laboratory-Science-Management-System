import { describe, expect, it } from "vitest";
import { apiPath } from "./client";

describe("versioned API paths", () => {
  it("normalizes a valid route", () => expect(apiPath("/api/v1/me")).toBe("/api/v1/me/"));
  it("rejects traversal and query injection", () => {
    for (const path of ["/api/v1/../auth/sign-out", "/api/v1/%2e%2e/auth/sign-out", "/api/v1/me?next=/api/auth", "/api/v1/other#fragment"]) {
      expect(() => apiPath(path)).toThrow();
    }
  });
});
