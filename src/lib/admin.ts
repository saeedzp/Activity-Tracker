/**
 * The passcode gate on the admin screens.
 *
 * Signing in as an employee is deliberately frictionless — a number, no
 * password — because it happens in an aisle on a phone. The admin screens
 * rewrite the route and the month's campaigns, so they take a separate code
 * that every employee number does not carry.
 *
 * The code lives in ADMIN_PASSCODE, never in the repository: this project is
 * public, and a passcode committed once is a passcode leaked forever.
 */

import { cookies } from "next/headers";

const COOKIE = "at_admin";
const MAX_AGE = 60 * 60 * 12; // Half a day: long enough to work, short enough to matter.

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("Missing SESSION_SECRET (see .env.example)");
  return value;
}

export function adminPasscode(): string | null {
  return process.env.ADMIN_PASSCODE?.trim() || null;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * The cookie is an HMAC over a marker and the passcode itself, so changing the
 * passcode invalidates every cookie issued under the old one.
 */
async function token(): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`admin:${adminPasscode() ?? ""}`),
  );
  return toBase64Url(signature);
}

/** Constant time, so a wrong code cannot be narrowed down by timing. */
function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkPasscode(given: string): Promise<boolean> {
  const expected = adminPasscode();
  if (!expected) return false;
  return sameString(given.trim(), expected);
}

export async function adminCookieValue(): Promise<string> {
  return token();
}

export async function isAdmin(): Promise<boolean> {
  // No passcode configured means the gate is not in place; refusing outright
  // is safer than letting everyone through, and /admin/login says so.
  if (!adminPasscode()) return false;
  const jar = await cookies();
  const held = jar.get(COOKIE)?.value;
  if (!held) return false;
  return sameString(held, await token());
}

export const ADMIN_COOKIE = COOKIE;
export const ADMIN_MAX_AGE = MAX_AGE;
