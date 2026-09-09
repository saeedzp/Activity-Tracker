import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client. Server-side only — this key bypasses RLS and must never
 * reach the browser bundle.
 */
export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see .env.example)",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
