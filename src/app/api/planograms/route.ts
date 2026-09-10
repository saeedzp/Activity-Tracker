import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";
import { photoBucket } from "@/lib/r2";
import { DISPLAY_TYPES } from "@/lib/domain";
import {
  looksLikePdf,
  MAX_PLANOGRAM_BYTES,
  PLANOGRAM_TYPE,
  planogramKey,
} from "@/lib/planogram";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

const SELECT = "id, activity_id, month, display_type, title, r2_key, bytes, created_at";

/** Add a planogram to a campaign, optionally for one size only. */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Passcode required" }, { status: 401 });
  }

  const bucket = photoBucket();
  if (!bucket) return NextResponse.json({ error: "File storage is not set up" }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const activityId = String(form?.get("activity_id") ?? "").trim();
  const title = String(form?.get("title") ?? "").trim() || null;
  const rawType = String(form?.get("display_type") ?? "").trim();

  if (!(file instanceof File) || !activityId) {
    return NextResponse.json({ error: "Choose an activity and a file" }, { status: 400 });
  }
  // Empty means the drawing covers every size in the campaign.
  const displayType = rawType === "" ? null : rawType;
  if (displayType && !(DISPLAY_TYPES as readonly string[]).includes(displayType)) {
    return NextResponse.json({ error: "Unknown size" }, { status: 400 });
  }
  if (file.size > MAX_PLANOGRAM_BYTES) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // The extension is a claim; the first bytes are the evidence. This file is
  // handed straight back to employees, so it is checked before it is stored.
  if (!looksLikePdf(bytes.subarray(0, 5))) {
    return NextResponse.json({ error: "That file is not a PDF" }, { status: 400 });
  }

  const db = serviceClient();
  const { data: activity } = await db
    .from("activities")
    .select("id, month")
    .eq("id", activityId)
    .maybeSingle();
  const plan = activity as { id: string; month: string | null } | null;
  if (!plan?.month) {
    return NextResponse.json({ error: "Activity not found" }, { status: 400 });
  }

  const key = planogramKey(plan.month, crypto.randomUUID());
  try {
    await bucket.put(key, bytes.buffer as ArrayBuffer, {
      httpMetadata: { contentType: PLANOGRAM_TYPE },
    });
  } catch (error) {
    console.error("planogram upload failed:", error);
    return NextResponse.json({ error: "Could not upload the file" }, { status: 502 });
  }

  const { data, error } = await db
    .from("planograms")
    .insert({
      activity_id: plan.id,
      month: plan.month,
      display_type: displayType,
      title,
      r2_key: key,
      bytes: file.size,
    })
    .select(SELECT)
    .single();

  if (error) {
    console.error("planogram row failed:", error.message);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
  return NextResponse.json({ planogram: data });
}

/**
 * Remove a planogram from the list.
 *
 * The object stays in the bucket. Deleting it would break any older
 * submission an auditor is reading alongside it, and the file is a few
 * megabytes — cheaper to keep than to regret.
 */
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Passcode required" }, { status: 401 });
  }
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = serviceClient();
  const { error } = await db.from("planograms").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
