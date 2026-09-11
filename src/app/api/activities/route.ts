import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";
import { checkImage } from "@/lib/activity-image";
import { CATEGORIES } from "@/lib/domain";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

const SELECT =
  "id, month, name, brands, brand_categories, effective_from, effective_to," +
  " image, active, sort_order";

/** The campaigns planned for one month. */
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Passcode required" }, { status: 401 });
  }

  const month = new URL(request.url).searchParams.get("month")?.trim();
  if (!month) return NextResponse.json({ error: "Choose the month" }, { status: 400 });

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
    return NextResponse.json({ error: "Passcode required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const month = String(body?.month ?? "").trim();
  const name = String(body?.name ?? "").trim();

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Choose the month" }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Enter the activity name" }, { status: 400 });

  // One campaign can carry several brands, and duplicates in the list are just
  // noise from typing.
  const brands: string[] = Array.isArray(body?.brands)
    ? [...new Set(body.brands.map((b: unknown) => String(b).trim()).filter(Boolean) as string[])]
    : [];
  if (brands.length === 0) {
    return NextResponse.json({ error: "Add at least one brand" }, { status: 400 });
  }

  // Checked here and not only in the browser: the picture goes into a column
  // the admin screen renders, and this route answers anyone holding the
  // passcode.
  const image = checkImage(body?.image);
  if (!image.ok) return NextResponse.json({ error: image.error }, { status: 400 });

  // A category per brand, keyed by brand so it cannot drift out of step with
  // the list beside it. Unknown categories are dropped rather than exported to
  // Mars as something they do not recognise.
  const categories: Record<string, string> = {};
  const given = (body?.brand_categories ?? {}) as Record<string, unknown>;
  for (const brand of brands) {
    const value = String(given[brand] ?? "").trim();
    if (value && (CATEGORIES as readonly string[]).includes(value)) {
      categories[brand] = value;
    }
  }

  // Optional: Mars does not always send campaign dates, and a required field
  // that is often unknowable only teaches people to type something false.
  const from = isoDate(body?.effective_from);
  const to = isoDate(body?.effective_to);
  if (from && to && from > to) {
    return NextResponse.json({ error: "Effective To is before Effective From" }, { status: 400 });
  }

  const db = serviceClient();
  const row = {
    month,
    name,
    brands,
    brand_categories: categories,
    effective_from: from,
    effective_to: to,
    image: image.image,
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
    return NextResponse.json({ error: "Passcode required" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = serviceClient();
  // Hidden rather than deleted: submissions reference it and the history has to
  // keep resolving it.
  const { error } = await db.from("activities").update({ active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** A plain YYYY-MM-DD, or null — never a half-parsed date. */
function isoDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}
