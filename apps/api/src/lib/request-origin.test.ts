import { describe, expect, it } from "vitest";
import { trustedMutationOrigin } from "./request-origin";

describe("API mutation origin", () => {
  const frontend = "https://lsms.example.edu/";
  it("accepts the exact website origin", () => {
    expect(
      trustedMutationOrigin(
        { origin: "https://lsms.example.edu", cookie: "session=abc" },
        frontend,
      ),
    ).toBe(true);
  });
  it("rejects lookalike, cross-site, and missing origins with cookies", () => {
    expect(
      trustedMutationOrigin(
        { origin: "https://lsms.example.edu.evil.test", cookie: "session=abc" },
        frontend,
      ),
    ).toBe(false);
    expect(
      trustedMutationOrigin(
        { origin: "https://lsms.example.edu", "sec-fetch-site": "cross-site" },
        frontend,
      ),
    ).toBe(false);
    expect(trustedMutationOrigin({ cookie: "session=abc" }, frontend)).toBe(
      false,
    );
  });
  it("allows unauthenticated non-browser registration requests", () => {
    expect(trustedMutationOrigin({}, frontend)).toBe(true);
  });
});
