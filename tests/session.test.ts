import { beforeAll, describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "@/lib/session";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-not-a-real-one";
});

describe("session cookie", () => {
  const session = { empId: "700072", role: "me" as const, name: "Employee One" };

  it("round-trips a session", async () => {
    expect(await decodeSession(await encodeSession(session))).toEqual(session);
  });

  it("rejects a cookie whose payload was edited", async () => {
    const [, signature] = (await encodeSession(session)).split(".");
    const forged = Buffer.from(JSON.stringify({ ...session, role: "tl" })).toString(
      "base64url",
    );
    expect(await decodeSession(`${forged}.${signature}`)).toBeNull();
  });

  it("rejects a cookie signed with a different secret", async () => {
    const other = await encodeSession(session);
    process.env.SESSION_SECRET = "a-different-secret";
    expect(await decodeSession(other)).toBeNull();
    process.env.SESSION_SECRET = "test-secret-not-a-real-one";
  });

  it("rejects malformed and missing cookies", async () => {
    expect(await decodeSession(undefined)).toBeNull();
    expect(await decodeSession("")).toBeNull();
    expect(await decodeSession("nodot")).toBeNull();
    expect(await decodeSession("a.b")).toBeNull();
  });

  it("rejects a payload carrying an unknown role", async () => {
    const payload = Buffer.from(
      JSON.stringify({ empId: "1", role: "admin", name: "x" }),
    ).toString("base64url");
    const signed = (await encodeSession(session)).split(".")[1];
    expect(await decodeSession(`${payload}.${signed}`)).toBeNull();
  });

  it("produces a different signature for a different payload", async () => {
    const a = await encodeSession(session);
    const b = await encodeSession({ ...session, empId: "700073" });
    expect(a.split(".")[1]).not.toBe(b.split(".")[1]);
  });
});
