/**
 * Deployment self-check.
 *
 * A missing environment variable used to surface as an unexplained 500, which
 * is the worst possible feedback when a deployment is being set up. These
 * helpers let the app say exactly what is missing without ever revealing a
 * value.
 */

export const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SESSION_SECRET",
] as const;

export const OPTIONAL_ENV = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "R2_PUBLIC_URL",
] as const;

export function missingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
}

export function isConfigured(): boolean {
  return missingEnv().length === 0;
}

/** Presence only — never the values themselves. */
export function envReport(): Record<string, boolean> {
  const report: Record<string, boolean> = {};
  for (const name of [...REQUIRED_ENV, ...OPTIONAL_ENV]) {
    report[name] = Boolean(process.env[name]?.trim());
  }
  return report;
}

/**
 * What the configured Supabase key actually claims to be.
 *
 * A Supabase key is a JWT whose payload is not secret — it names the project
 * and the role. Reading it turns the two commonest deployment mistakes, pasting
 * the anon key into the service-role slot and pasting a key from a different
 * project, from a blank 401 into a plain statement. The signature is never
 * inspected and no part of the key is returned.
 */
export function describeServiceKey(): Record<string, unknown> {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!raw) return { present: false };

  const parts = raw.split(".");
  const shape: Record<string, unknown> = {
    present: true,
    length: raw.length,
    looks_like_jwt: parts.length === 3,
    // A copy that lost its tail is the usual cause of a rejected key.
    has_whitespace: raw !== process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  if (parts.length !== 3) return shape;

  try {
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    shape.role = payload.role;
    shape.project_ref = payload.ref;
    shape.is_service_role = payload.role === "service_role";
  } catch {
    shape.payload_unreadable = true;
  }
  return shape;
}

/** Which project the configured URL points at, for comparison with the key. */
export function urlProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null;
}
