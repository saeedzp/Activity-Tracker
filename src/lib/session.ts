/**
 * Session handling.
 *
 * The only credential is an employee number, so the cookie must not be
 * forgeable: it carries the number plus an HMAC over it, signed with a server
 * secret. A tampered cookie fails verification and is treated as absent.
 *
 * Built on Web Crypto rather than node:crypto so the same code runs under the
 * edge runtime Cloudflare Pages uses, under Node during tests, and in the
 * browserless Worker sandbox — with no polyfill and no compatibility flag.
 */

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
  if (!value) throw new Error("Missing SESSION_SECRET (see .env.example)");
  return value;
}

const encoder = new TextEncoder();

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function encodeSession(session: Session): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload));
  return `${payload}.${toBase64Url(signature)}`;
}

export async function decodeSession(raw: string | undefined): Promise<Session | null> {
  if (!raw) return null;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  let valid = false;
  try {
    // crypto.subtle.verify compares in constant time.
    valid = await crypto.subtle.verify(
      "HMAC",
      await key(),
      fromBase64Url(signature) as BufferSource,
      encoder.encode(payload),
    );
  } catch {
    return null;
  }
  if (!valid) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
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
