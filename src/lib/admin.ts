/**
 * The passcode gate on the admin screens.
 *
 * Signing in as an employee is deliberately frictionless — a number, no
 * password — because it happens in an aisle on a phone. The admin screens
 * rewrite the route and the month's campaigns, so they take a separate code.
 *
 * The code lives in app_settings as a salted SHA-256, not in the repository
 * and not in a build variable: the project is public, a code committed once is
 * leaked forever, and keeping it in the database means changing it needs no
 * redeploy.
 *
 * The hash is not the defence — four digits fall to anyone who already has the
 * database. The defence is that the code appears in no file anyone can read,
 * plus the delay on a wrong attempt.
 */

import { cookies } from "next/headers";
import { serviceClient } from "./supabase";

const COOKIE = "at_admin";
const MAX_AGE = 60 * 60 * 12; // Half a day: long enough to work, short enough to matter.

const SALT_KEY = "admin_passcode_salt";
const HASH_KEY = "admin_passcode_hash";

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/** Constant time, so a wrong code cannot be narrowed down by timing. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface StoredPasscode {
  salt: string;
  hash: string;
}

async function storedPasscode(): Promise<StoredPasscode | null> {
  try {
    const db = serviceClient();
    const { data } = await db
      .from("app_settings")
      .select("key, value")
      .in("key", [SALT_KEY, HASH_KEY]);

    const rows = (data ?? []) as { key: string; value: string }[];
    const salt = rows.find((r) => r.key === SALT_KEY)?.value;
    const hash = rows.find((r) => r.key === HASH_KEY)?.value;
    return salt && hash ? { salt, hash } : null;
  } catch {
    return null;
  }
}

export async function passcodeConfigured(): Promise<boolean> {
  return (await storedPasscode()) !== null;
}

export async function checkPasscode(given: string): Promise<boolean> {
  const stored = await storedPasscode();
  if (!stored) return false;
  return sameString(await sha256Hex(`${stored.salt}:${given.trim()}`), stored.hash);
}

/**
 * The cookie is an HMAC over the stored hash, so changing the passcode
 * invalidates every cookie issued under the old one.
 */
async function token(): Promise<string | null> {
  const secret = process.env.SESSION_SECRET;
  const stored = await storedPasscode();
  if (!secret || !stored) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(`admin:${stored.hash}`)));
}

export async function adminCookieValue(): Promise<string | null> {
  return token();
}

export async function isAdmin(): Promise<boolean> {
  const expected = await token();
  // No passcode stored means the gate is not in place; refusing outright is
  // safer than letting everyone through, and the login screen says so.
  if (!expected) return false;
  const jar = await cookies();
  const held = jar.get(COOKIE)?.value;
  return held ? sameString(held, expected) : false;
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_MAX_AGE = MAX_AGE;
