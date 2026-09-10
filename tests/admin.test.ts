import { describe, expect, it } from "vitest";
import { sha256Hex } from "@/lib/admin";

/**
 * checkPasscode reads the stored hash from the database, so the pure part —
 * how a code becomes a hash — is what is worth pinning here.
 */
describe("passcode hashing", () => {
  const salt = "2b7d01506bf6eaf63f502f564c817792";

  it("is stable for the same salt and code", async () => {
    const a = await sha256Hex(`${salt}:1234`);
    const b = await sha256Hex(`${salt}:1234`);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("changes completely for a different code", async () => {
    const a = await sha256Hex(`${salt}:1234`);
    const b = await sha256Hex(`${salt}:1235`);
    expect(a).not.toBe(b);
  });

  it("changes completely for a different salt, so two sites never share a hash", async () => {
    const a = await sha256Hex(`${salt}:1234`);
    const b = await sha256Hex(`other:1234`);
    expect(a).not.toBe(b);
  });

  it("does not collide across the salt boundary", async () => {
    // "ab:c" and "a:bc" must not hash alike, or a salt could be forged.
    expect(await sha256Hex("ab:c")).not.toBe(await sha256Hex("a:bc"));
  });

  it("returns lowercase hex only", async () => {
    expect(await sha256Hex("anything")).toMatch(/^[0-9a-f]{64}$/);
  });
});
