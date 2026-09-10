import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

const SELECT =
  "id, month, store_id, emp_id, activity_name, brands, display_type, entered, entry_date," +
  " implementation_date, status, reason_code, alt_store_name, note," +
  " custom_posm, activity_id, submitted_at, approved";

/**
 * Every submission, newest first, filterable by month and store.
 *
 * Whole rows rather than a summary: the point of keeping history is to answer
 * a question nobody has asked yet, and Mars asking for a year of detail is
 * exactly that question.
 */
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Passcode required" }, { status: 401 });
  }

  const url = new URL(request.url);
  const month = url.searchParams.get("month")?.trim();
  const storeId = url.searchParams.get("store")?.trim();
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 500) || 500, 2000);

  const db = serviceClient();
  let query = db
    .from("submissions")
    .select(SELECT)
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (month) query = query.eq("month", month);
  if (storeId) query = query.eq("store_id", storeId);

  const [rows, months] = await Promise.all([
    query,
    db.from("submissions").select("month").not("month", "is", null),
  ]);

  if (rows.error) return NextResponse.json({ error: rows.error.message }, { status: 500 });

  return NextResponse.json({
    submissions: rows.data ?? [],
    months: [
      ...new Set(((months.data ?? []) as { month: string }[]).map((r) => r.month)),
    ].sort().reverse(),
  });
}
