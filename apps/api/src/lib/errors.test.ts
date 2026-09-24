import { APIError } from "better-auth/api";
import { describe, expect, it } from "vitest";
import { applicationError } from "./errors";

describe("account creation errors", () => {
  it("reports duplicate Better Auth email as a conflict", () => {
    const error = APIError.from("UNPROCESSABLE_ENTITY", {
      code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
      message: "User already exists. Use another email.",
    });
    const mapped = applicationError(error);
    expect(mapped.statusCode).toBe(409);
    expect(mapped.code).toBe("EMAIL_EXISTS");
  });

  it("reports PostgreSQL institutional ID conflicts without leaking SQL", () => {
    const mapped = applicationError({
      cause: {
        code: "23505",
        constraint_name: "users_institutional_id_key",
      },
    });
    expect(mapped.statusCode).toBe(409);
    expect(mapped.message).toBe("That institutional ID is already registered.");
  });
});
