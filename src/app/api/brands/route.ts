import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { currentSession } from "@/lib/session";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

const SELECT = "id, name, image_url, color, active, sort_order";

export async function GET() {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const db = serviceClient();
  const { data, error } = await db
    .from("brands")
    .select(SELECT)
    .order("sort_order")
    .order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brands: data ?? [] });
}

/** Add a brand, or update one by id. */
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "اكتب اسم البراند" }, { status: 400 });

  const imageUrl = String(body?.image_url ?? "").trim() || null;
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
    // A plain http image is blocked as mixed content once the app is on https,
    // so it would simply never appear.
    return NextResponse.json({ error: "رابط الصورة لازم يبدأ بـ https" }, { status: 400 });
  }

  const row = {
    name,
    image_url: imageUrl,
    color: String(body?.color ?? "").trim() || "#6E685C",
    active: body?.active !== false,
    sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 100,
    ...(body?.id ? { id: String(body.id) } : {}),
  };

  const db = serviceClient();
  const { data, error } = await db
    .from("brands")
    .upsert(row, { onConflict: body?.id ? "id" : "name" })
    .select(SELECT)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brand: data });
}

export async function DELETE(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  // Hidden rather than deleted: past submissions name this brand, and the
  // export has to keep resolving it.
  const db = serviceClient();
  const { error } = await db.from("brands").update({ active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
