import { beforeEach, describe, expect, it } from "vitest";
import { adminPasscode, checkPasscode } from "@/lib/admin";

describe("admin passcode", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-secret-not-a-real-one";
    process.env.ADMIN_PASSCODE = "1234";
  });

  it("accepts the configured code", async () => {
    expect(await checkPasscode("1234")).toBe(true);
  });

  it("ignores surrounding whitespace, which phones add", async () => {
    expect(await checkPasscode("  1234 ")).toBe(true);
  });

  it("rejects a wrong code", async () => {
    expect(await checkPasscode("1235")).toBe(false);
    expect(await checkPasscode("")).toBe(false);
  });

  it("rejects a code that merely starts right", async () => {
    expect(await checkPasscode("123")).toBe(false);
    expect(await checkPasscode("12345")).toBe(false);
  });

  it("refuses everything when no code is configured", async () => {
    delete process.env.ADMIN_PASSCODE;
    expect(adminPasscode()).toBeNull();
    // Locked out beats open to all: /admin/login says what is missing.
    expect(await checkPasscode("anything")).toBe(false);
    expect(await checkPasscode("")).toBe(false);
  });

  it("treats a blank configured code as none at all", async () => {
    process.env.ADMIN_PASSCODE = "   ";
    expect(adminPasscode()).toBeNull();
    expect(await checkPasscode("   ")).toBe(false);
  });
});
