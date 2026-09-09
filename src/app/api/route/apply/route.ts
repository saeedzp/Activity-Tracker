import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
import { diffRoute, usersFrom, type StoreRecordRow } from "@/lib/route-import";
import { parseRouteFile, STORE_COLUMNS } from "@/lib/route-service";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

/**
 * Replace the route from an uploaded file.
 *
 * The file is the month's truth: every store in it is written, and any store
 * no longer in it is switched off. Switched off, never deleted — its
 * submissions stay and the export still has to resolve it.
 *
 * The comparison still runs, but only to report what happened afterwards.
 */
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "اختر ملف الروت" }, { status: 400 });
  }

  let incoming: StoreRecordRow[];
  try {
    incoming = parseRouteFile(file.name, new Uint8Array(await file.arrayBuffer()));
  } catch {
    return NextResponse.json(
      { error: "تعذّرت قراءة الملف. تأكد إنه xlsx أو csv بنفس الأعمدة." },
      { status: 400 },
    );
  }
  if (incoming.length === 0) {
    return NextResponse.json(
      { error: "ما فيه صفوف صالحة. تأكد إن عمود STORE ID موجود ومعبّى." },
      { status: 400 },
    );
  }

  const db = serviceClient();
  const [existing, knownUsers] = await Promise.all([
    db.from("stores").select(STORE_COLUMNS),
    db.from("users").select("emp_id"),
  ]);
  if (existing.error) {
    return NextResponse.json({ error: existing.error.message }, { status: 500 });
  }

  const before = (existing.data ?? []) as unknown as StoreRecordRow[];
  const diff = diffRoute(
    incoming,
    before,
    ((knownUsers.data ?? []) as { emp_id: string }[]).map((u) => u.emp_id),
  );

  // Employees first: a store row references one and would be rejected without it.
  const users = usersFrom(incoming).map((u) => ({ ...u, active: true }));
  for (let i = 0; i < users.length; i += 500) {
    const { error } = await db
      .from("users")
      .upsert(users.slice(i, i + 500), { onConflict: "emp_id" });
    if (error) {
      return NextResponse.json({ error: `الموظفون: ${error.message}` }, { status: 500 });
    }
  }

  const rows = incoming.map((s) => ({
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
    // A store back in the file is live again even if it had been switched off.
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

  const gone = diff.missing.map((s) => s.id);
  if (gone.length > 0) {
    const { error } = await db.from("stores").update({ active: false }).in("id", gone);
    if (error) {
      return NextResponse.json({ error: `التعطيل: ${error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    file: file.name,
    stores: rows.length,
    users: users.length,
    added: diff.added.length,
    changed: diff.changed.length,
    unchanged: diff.unchanged,
    deactivated: gone.length,
    newUsers: diff.newUsers.length,
    // Named so a partial file is recognisable from the result rather than from
    // an employee reporting a missing store days later.
    deactivatedNames: diff.missing.slice(0, 25).map((s) => `${s.name} (${s.id})`),
  });
}
