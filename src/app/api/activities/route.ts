import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

const SELECT = "id, month, name, brands, active, sort_order";

/** The campaigns planned for one month. */
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "يلزم الرقم السري" }, { status: 401 });
  }

  const month = new URL(request.url).searchParams.get("month")?.trim();
  if (!month) return NextResponse.json({ error: "اختر الشهر" }, { status: 400 });

  const db = serviceClient();
  const { data, error } = await db
    .from("activities")
    .select(SELECT)
    .eq("month", month)
    .order("sort_order")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activities: data ?? [] });
}

/** Add a campaign, or edit one by id. */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "يلزم الرقم السري" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const month = String(body?.month ?? "").trim();
  const name = String(body?.name ?? "").trim();

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "اختر الشهر" }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "اكتب اسم الاكتفيتي" }, { status: 400 });

  // One campaign can carry several brands, and duplicates in the list are just
  // noise from typing.
  const brands = Array.isArray(body?.brands)
    ? [...new Set(body.brands.map((b: unknown) => String(b).trim()).filter(Boolean))]
    : [];
  if (brands.length === 0) {
    return NextResponse.json({ error: "أضف براند واحد على الأقل" }, { status: 400 });
  }

  const db = serviceClient();
  const row = {
    month,
    name,
    brands,
    active: body?.active !== false,
    sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 100,
  };

  const { data, error } = body?.id
    ? await db.from("activities").update(row).eq("id", String(body.id)).select(SELECT).single()
    : await db.from("activities").insert(row).select(SELECT).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activity: data });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "يلزم الرقم السري" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id مطلوب" }, { status: 400 });

  const db = serviceClient();
  // Hidden rather than deleted: submissions reference it and the history has to
  // keep resolving it.
  const { error } = await db.from("activities").update({ active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
