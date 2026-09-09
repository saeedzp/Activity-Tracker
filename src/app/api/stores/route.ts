import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
import { rankCandidates, type StoreRecord } from "@/lib/match";

/**
 * Store lookup for the grid's store picker.
 *
 * `q` filters by name; `suggest_for` instead ranks the whole estate against a
 * raw Mars store name and returns the three nearest, which is what the linking
 * column offers when a row could not be matched.
 */
export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const suggestFor = url.searchParams.get("suggest_for")?.trim() ?? "";
  const account = url.searchParams.get("account")?.trim() ?? "";

  const db = serviceClient();

  if (suggestFor) {
    const { data, error } = await db
      .from("stores")
      .select("id, name, account, city, region, mars_code, retailer_no");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const suggestions = rankCandidates(
      { mars_store_no: "", mars_store_name: suggestFor, account },
      (data ?? []) as StoreRecord[],
    );
    return NextResponse.json({
      stores: suggestions.map((s) => ({ ...s.store, score: Number(s.score.toFixed(3)) })),
    });
  }

  let query = db
    .from("stores")
    .select("id, name, account, city, region")
    .order("name")
    .limit(50);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stores: data ?? [] });
}
