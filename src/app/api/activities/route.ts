import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
import { isRowEmpty, isRowValid, type ActivityDraft } from "@/lib/grid";
import { matchStore, type StoreAlias, type StoreRecord } from "@/lib/match";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

const SELECT =
  "id, period, brand, display_type, promo_desc, effective_from, effective_to," +
  " planned_store_id, account, region, city, mars_store_no, mars_store_name," +
  " match_method, match_score, status, reason_code, closed, created_at";

/** Read one period's activity lines for the grid. */
export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const period = new URL(request.url).searchParams.get("period")?.trim();
  if (!period) return NextResponse.json({ error: "period مطلوب" }, { status: 400 });

  const db = serviceClient();
  const [activities, stores] = await Promise.all([
    db.from("activities").select(SELECT).eq("period", period).order("created_at"),
    db.from("stores").select("id, name, account, city, region").order("name"),
  ]);

  if (activities.error) {
    return NextResponse.json({ error: activities.error.message }, { status: 500 });
  }
  return NextResponse.json({
    activities: activities.data ?? [],
    stores: stores.data ?? [],
  });
}

interface SavePayload {
  period?: string;
  rows?: ActivityDraft[];
  deleted?: string[];
}

/**
 * Save the grid.
 *
 * Rows arrive as the operator left them: some new, some edited, some blank.
 * Blank rows are skipped, incomplete rows are reported back rather than
 * written, and a row with no store still gets run through the match engine so
 * the grid can show what it would link to.
 */
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as SavePayload | null;
  const period = body?.period?.trim();
  const rows = body?.rows ?? [];
  const deleted = body?.deleted ?? [];
  if (!period) return NextResponse.json({ error: "period مطلوب" }, { status: 400 });

  const db = serviceClient();

  const [storeResult, aliasResult] = await Promise.all([
    db.from("stores").select("id, name, account, city, region, mars_code, retailer_no"),
    db.from("store_aliases").select("mars_store_no, mars_store_name, account, store_id"),
  ]);
  if (storeResult.error) {
    return NextResponse.json({ error: storeResult.error.message }, { status: 500 });
  }
  const stores = (storeResult.data ?? []) as StoreRecord[];
  const aliases = (aliasResult.data ?? []) as StoreAlias[];
  const byId = new Map(stores.map((s) => [s.id, s]));

  const rejected: { key: string; reason: string }[] = [];
  const toWrite: Record<string, unknown>[] = [];

  for (const row of rows) {
    if (isRowEmpty(row)) continue;

    // An unlinked row is matched here so the operator does not have to link
    // every line by hand before the grid will save.
    let storeId = row.planned_store_id;
    let method = row.match_method;
    let score = row.match_score;
    if (!storeId) {
      const result = matchStore(
        {
          mars_store_no: row.mars_store_no,
          mars_store_name: row.mars_store_name,
          account: row.account,
        },
        stores,
        aliases,
      );
      storeId = result.store_id;
      method = result.match_method;
      score = result.match_score;
    }

    const resolved: ActivityDraft = {
      ...row,
      planned_store_id: storeId,
      match_method: method,
      match_score: score,
    };
    if (!isRowValid(resolved)) {
      rejected.push({ key: row.key, reason: "سطر ناقص أو غير مربوط" });
      continue;
    }

    const store = storeId ? byId.get(storeId) : undefined;
    toWrite.push({
      ...(row.id ? { id: row.id } : {}),
      period,
      brand: resolved.brand,
      display_type: resolved.display_type,
      promo_desc: resolved.promo_desc || null,
      effective_from: resolved.effective_from || null,
      effective_to: resolved.effective_to || null,
      planned_store_id: storeId,
      // Denormalized from the linked store so the export does not have to join.
      account: store?.account ?? resolved.account ?? null,
      region: store?.region ?? null,
      city: store?.city ?? null,
      mars_store_no: resolved.mars_store_no || null,
      mars_store_name: resolved.mars_store_name || null,
      match_method: method,
      match_score: score,
    });
  }

  if (deleted.length > 0) {
    // Only lines nobody has reported against may be removed; the rest are the
    // audit trail for work already done.
    const { data: used } = await db
      .from("submissions")
      .select("activity_id")
      .in("activity_id", deleted);
    const locked = new Set((used ?? []).map((r) => r.activity_id));
    const removable = deleted.filter((id) => !locked.has(id));
    if (removable.length > 0) {
      const { error } = await db.from("activities").delete().in("id", removable);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    for (const id of deleted.filter((id) => locked.has(id))) {
      rejected.push({ key: id, reason: "فيه إدخالات مرتبطة، ما ينحذف" });
    }
  }

  let saved: unknown[] = [];
  if (toWrite.length > 0) {
    const { data, error } = await db
      .from("activities")
      .upsert(toWrite, { onConflict: "id" })
      .select(SELECT);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    saved = data ?? [];
  }

  return NextResponse.json({ saved, rejected });
}
