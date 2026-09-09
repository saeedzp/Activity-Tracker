import { beforeAll, describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "@/lib/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-not-a-real-one";
});

describe("session cookie", () => {
  const session = { empId: "700072", role: "me" as const, name: "Employee One" };

  it("round-trips a session", () => {
    expect(decodeSession(encodeSession(session))).toEqual(session);
  });

  it("rejects a cookie whose payload was edited", () => {
    const [, signature] = encodeSession(session).split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...session, role: "tl" }),
    ).toString("base64url");
    expect(decodeSession(`${forged}.${signature}`)).toBeNull();
  });

  it("rejects a cookie signed with a different secret", () => {
    const other = encodeSession(session);
    process.env.SESSION_SECRET = "a-different-secret";
    expect(decodeSession(other)).toBeNull();
    process.env.SESSION_SECRET = "test-secret-not-a-real-one";
  });

  it("rejects malformed and missing cookies", () => {
    expect(decodeSession(undefined)).toBeNull();
    expect(decodeSession("")).toBeNull();
    expect(decodeSession("nodot")).toBeNull();
    expect(decodeSession("a.b")).toBeNull();
  });

  it("rejects a payload carrying an unknown role", () => {
    const payload = Buffer.from(
      JSON.stringify({ empId: "1", role: "admin", name: "x" }),
    ).toString("base64url");
    // Signed correctly, but the role is not one we issue.
    const signed = encodeSession(session).split(".")[1];
    expect(decodeSession(`${payload}.${signed}`)).toBeNull();
  });
});
