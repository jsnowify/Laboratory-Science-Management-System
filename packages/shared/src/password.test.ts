import { describe, expect, it } from "vitest";
import { setupInput, strongPassword } from "./schemas";

describe("account password policy", () => {
  it("requires a long mixed-character password for ordinary accounts", () => {
    expect(strongPassword.safeParse("short123!").success).toBe(false);
    expect(strongPassword.safeParse("lowercase123!").success).toBe(false);
    expect(strongPassword.safeParse("UPPERCASE123!").success).toBe(false);
    expect(strongPassword.safeParse("MixedLetters!!").success).toBe(false);
    expect(strongPassword.safeParse("MixedLetters123").success).toBe(false);
    expect(strongPassword.safeParse("MixedLetters123!").success).toBe(true);
  });

  it("allows a temporary setup password without weakening ordinary registration", () => {
    const common = {
      institutionalId: "STAFF-001",
      firstName: "First",
      lastName: "Admin",
      email: "admin@example.test",
      setupToken: "setup-token",
    };
    expect(
      setupInput.safeParse({ ...common, password: "temporary1234" }).success,
    ).toBe(true);
    expect(strongPassword.safeParse("temporary1234").success).toBe(false);
  });
});
