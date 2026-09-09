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
