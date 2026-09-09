/**
 * Session handling.
 *
 * The only credential is an employee number, so the cookie must not be
 * forgeable: it carries the number plus an HMAC over it, signed with a server
 * secret. A tampered cookie fails the signature check and is treated as absent.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "./domain";

const COOKIE = "at_session";
const MAX_AGE = 60 * 60 * 24 * 180; // Six months: employees should not re-enter it daily.

export interface Session {
  empId: string;
  role: Role;
  name: string;
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("Missing SESSION_SECRET (see .env.example)");
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed?.empId !== "string" || (parsed.role !== "me" && parsed.role !== "tl")) {
      return null;
    }
    return { empId: parsed.empId, role: parsed.role, name: String(parsed.name ?? "") };
  } catch {
    return null;
  }
}

export async function currentSession(): Promise<Session | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = MAX_AGE;
