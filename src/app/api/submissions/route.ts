import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
import { monthOf } from "@/lib/dates";
import { isPhotoKey, MAX_PHOTOS } from "@/lib/photo-key";
import {
  asksCustomPosm,
  STATUSES,
  isClosing,
  reasonCodesFor,
  requiresAltStoreName,
  requiresReasonCode,
  type Status,
} from "@/lib/domain";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

/**
 * Record one submission.
 *
 * Append-only: a correction is a new row, never an edit of an old one. The
 * latest row per store, activity and size is the current state.
 */
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const storeId = String(body?.store_id ?? "").trim();
  const activityId = String(body?.activity_id ?? "").trim();
  const displayType = String(body?.display_type ?? "").trim();
  const status = String(body?.status ?? "").trim() as Status;
  const reasonCode = body?.reason_code ? String(body.reason_code).trim() : null;
  const altStoreName = body?.alt_store_name ? String(body.alt_store_name).trim() : null;

  if (!storeId || !activityId || !displayType) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }
  if (!(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "حالة غير معروفة" }, { status: 400 });
  }
  if (reasonCode && !reasonCodesFor(status).includes(reasonCode)) {
    return NextResponse.json({ error: "كود السبب غير صحيح لهذه الحالة" }, { status: 400 });
  }
  // Not Implemented is the one status that always owes an explanation.
  if (status === "Not Implemented" && !reasonCode) {
    return NextResponse.json({ error: "اختر السبب" }, { status: 400 });
  }
  if (requiresAltStoreName(status) && !altStoreName) {
    return NextResponse.json({ error: "اكتب اسم السوق الفعلي" }, { status: 400 });
  }
  // "Other" names no cause on its own, so the explanation is what makes the row
  // worth anything to whoever reads the export.
  const note = body?.note ? String(body.note).trim() : null;
  if (reasonCode === "Other" && !note) {
    return NextResponse.json({ error: "اكتب السبب" }, { status: 400 });
  }

  // Photos are uploaded first and claimed here by key. Checked rather than
  // trusted: a key is a path, and these are rendered back to whoever reads the
  // history.
  const keys = Array.isArray(body?.photos) ? body.photos : [];
  if (keys.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `أقصى عدد صور ${MAX_PHOTOS}` }, { status: 400 });
  }
  if (!keys.every(isPhotoKey)) {
    return NextResponse.json({ error: "صورة غير صالحة" }, { status: 400 });
  }
  // The one status that claims something happened is the one that owes proof,
  // and the rule belongs here rather than only in the form: the form is a
  // convenience, this route is the record.
  if (status === "Implemented" && keys.length === 0) {
    return NextResponse.json({ error: "أضف صورة واحدة على الأقل" }, { status: 400 });
  }

  const db = serviceClient();

  // The campaign is read rather than trusted from the client: its name, brands
  // and month are copied onto the submission, so editing the campaign later
  // never rewrites what was reported at the time.
  const { data: activity } = await db
    .from("activities")
    .select("id, month, name, brands")
    .eq("id", activityId)
    .maybeSingle();

  if (!activity) {
    return NextResponse.json({ error: "الاكتفيتي غير موجود" }, { status: 400 });
  }
  const plan = activity as unknown as {
    id: string;
    month: string | null;
    name: string | null;
    brands: string[] | null;
  };

  const { data, error } = await db
    .from("submissions")
    .insert({
      store_id: storeId,
      emp_id: session.empId,
      activity_id: plan.id,
      // The campaign's own month, so a September stand recorded in October is
      // still reported against September.
      month: plan.month ?? monthOf(new Date()),
      activity_name: plan.name,
      brands: plan.brands ?? [],
      display_type: displayType,
      entered: typeof body?.entered === "boolean" ? body.entered : null,
      entry_date: body?.entry_date || null,
      implementation_date: body?.implementation_date || null,
      status,
      // The status decides whether a reason code belongs here at all.
      reason_code: status === "Implemented in another store" ? null : reasonCode,
      alt_store_name: requiresAltStoreName(status) ? altStoreName : null,
      note,
      // Only the permanent fixtures are asked, so anything else stores null
      // rather than a false that would read as "no POSM fitted".
      custom_posm:
        asksCustomPosm(displayType) && typeof body?.custom_posm === "boolean"
          ? body.custom_posm
          : null,
      // submitted_at is left to the database default: the phone clock is not trusted.
    })
    .select("id, submitted_at")
    .single();

  if (error) {
    console.error("submission insert failed:", error.message);
    return NextResponse.json({ error: "تعذّر الحفظ، حاول مرة ثانية" }, { status: 500 });
  }

  if (keys.length > 0) {
    // The submission is already saved. A photo row that fails to write leaves
    // the object in the bucket and the report intact, which is far better than
    // refusing a submission the employee has already made.
    const { error: photoError } = await db
      .from("photos")
      .insert(keys.map((r2_key: string) => ({ submission_id: data.id, r2_key })));
    if (photoError) console.error("photo rows failed:", photoError.message);
  }

  return NextResponse.json({
    id: data.id,
    closed: isClosing(status),
    month: plan.month,
  });
}
