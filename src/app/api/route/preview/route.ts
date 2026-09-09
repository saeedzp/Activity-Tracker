import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
import { diffRoute, type StoreRecordRow } from "@/lib/route-import";
import { parseRouteFile, STORE_COLUMNS } from "@/lib/route-service";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

/**
 * Read an uploaded route file and say what applying it would change.
 *
 * Nothing is written here. The upload is deliberately two steps so a month's
 * route is never replaced on the strength of picking the wrong file.
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
  const [stores, users] = await Promise.all([
    db.from("stores").select(STORE_COLUMNS),
    db.from("users").select("emp_id"),
  ]);
  if (stores.error) {
    return NextResponse.json({ error: stores.error.message }, { status: 500 });
  }

  const diff = diffRoute(
    incoming,
    (stores.data ?? []) as unknown as StoreRecordRow[],
    ((users.data ?? []) as { emp_id: string }[]).map((u) => u.emp_id),
  );

  return NextResponse.json({
    file: file.name,
    rows: incoming.length,
    diff,
    // Echoed back so applying uses exactly the rows that were shown.
    stores: incoming,
  });
}
