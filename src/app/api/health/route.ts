import { NextResponse } from "next/server";
import { envReport, missingEnv } from "@/lib/config";
import { serviceClient } from "@/lib/supabase";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

export const dynamic = "force-dynamic";

/**
 * Deployment diagnostic. Reports which variables are set and whether the
 * database answers, so a broken deploy can be diagnosed from the browser.
 * Only booleans and counts are returned — never a secret.
 */
export async function GET() {
  const missing = missingEnv();
  let database: Record<string, unknown> = { reachable: false };

  if (missing.length === 0) {
    try {
      const db = serviceClient();
      const [stores, users] = await Promise.all([
        db.from("stores").select("id", { count: "exact", head: true }),
        db.from("users").select("emp_id", { count: "exact", head: true }),
      ]);
      database = stores.error
        ? { reachable: false, error: stores.error.message }
        : { reachable: true, stores: stores.count ?? 0, users: users.count ?? 0 };
    } catch (error) {
      database = {
        reachable: false,
        error: error instanceof Error ? error.message : "unknown error",
      };
    }
  }

  return NextResponse.json(
    { ok: missing.length === 0 && database.reachable === true, missing, env: envReport(), database },
    { status: missing.length === 0 ? 200 : 503 },
  );
}
