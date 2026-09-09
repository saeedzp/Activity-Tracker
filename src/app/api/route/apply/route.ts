import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
import { usersFrom, type StoreRecordRow } from "@/lib/route-import";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

/**
 * Write the reviewed route.
 *
 * Employees go in first: a store points at one, and the row would be rejected
 * if the employee were not there yet.
 */
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const stores = (body?.stores ?? []) as StoreRecordRow[];
  const deactivate = (body?.deactivate ?? []) as string[];

  if (!Array.isArray(stores) || stores.length === 0) {
    return NextResponse.json({ error: "ما فيه أسواق للحفظ" }, { status: 400 });
  }

  const db = serviceClient();

  const users = usersFrom(stores).map((u) => ({ ...u, active: true }));
  for (let i = 0; i < users.length; i += 500) {
    const { error } = await db
      .from("users")
      .upsert(users.slice(i, i + 500), { onConflict: "emp_id" });
    if (error) {
      return NextResponse.json({ error: `الموظفون: ${error.message}` }, { status: 500 });
    }
  }

  const rows = stores.map((s) => ({
    id: s.id,
    name: s.name,
    account: s.account,
    city: s.city,
    region: s.region,
    mars_code: s.mars_code,
    retailer_no: s.retailer_no,
    me_id: s.me_id,
    me_name: s.me_name,
    tl_id: s.tl_id,
    tl_name: s.tl_name,
    // A store present in the file is live again even if it was switched off.
    active: true,
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from("stores")
      .upsert(rows.slice(i, i + 500), { onConflict: "id" });
    if (error) {
      return NextResponse.json({ error: `الأسواق: ${error.message}` }, { status: 500 });
    }
  }

  // Switched off, never deleted: their submissions stay and the export needs them.
  let deactivated = 0;
  if (deactivate.length > 0) {
    const { error, count } = await db
      .from("stores")
      .update({ active: false }, { count: "exact" })
      .in("id", deactivate);
    if (error) {
      return NextResponse.json({ error: `التعطيل: ${error.message}` }, { status: 500 });
    }
    deactivated = count ?? deactivate.length;
  }

  return NextResponse.json({
    stores: rows.length,
    users: users.length,
    deactivated,
  });
}
