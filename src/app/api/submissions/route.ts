import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
import { monthOf } from "@/lib/dates";
import { isPhotoKey, MAX_PHOTOS } from "@/lib/photo-key";
import {
  asksCustomPosm,
  brandCategories,
  isBrand,
  isClosing,
  isEntryStatus,
  isPlanogramReason,
  type Status,
} from "@/lib/domain";
import { currentLang } from "@/lib/lang-server";
import { t } from "@/lib/i18n";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

/**
 * Record one submission.
 *
 * Append-only: a correction is a new row, never an edit of an old one. The
 * latest row per store, activity and size is the current state.
 */
export async function POST(request: Request) {
  const m = t(await currentLang()).api;
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: m.unauthorised }, { status: 401 });

  const body = await request.json().catch(() => null);
  const storeId = String(body?.store_id ?? "").trim();
  const activityId = String(body?.activity_id ?? "").trim();
  const displayType = String(body?.display_type ?? "").trim();
  const status = String(body?.status ?? "").trim() as Status;
  const reasonCode = body?.reason_code ? String(body.reason_code).trim() : null;

  if (!storeId || !displayType) {
    return NextResponse.json({ error: m.missingFields }, { status: 400 });
  }
  // Only the two answers the question offers. The older statuses stay valid in
  // the table for the rows recorded under them, but nothing new is filed so.
  if (!isEntryStatus(status)) {
    return NextResponse.json({ error: m.unknownStatus }, { status: 400 });
  }
  // A yes carries no reason; a no always says which of the two it is.
  if (status === "Implemented" && reasonCode) {
    return NextResponse.json({ error: m.wrongReasonForStatus }, { status: 400 });
  }
  if (status === "Not Implemented") {
    if (!reasonCode) return NextResponse.json({ error: m.chooseReason }, { status: 400 });
    if (!isPlanogramReason(reasonCode)) {
      return NextResponse.json({ error: m.wrongReasonForStatus }, { status: 400 });
    }
  }

  // Photos are uploaded first and claimed here by key, in side order: the
  // first is side one. Checked rather than trusted: a key is a path, and these
  // are rendered back to whoever reads the history.
  const keys = Array.isArray(body?.photos) ? body.photos : [];
  if (keys.length > MAX_PHOTOS) {
    return NextResponse.json({ error: m.maxPhotos(MAX_PHOTOS) }, { status: 400 });
  }
  if (!keys.every(isPhotoKey)) {
    return NextResponse.json({ error: m.badPhoto }, { status: 400 });
  }
  // Both answers owe a photo now: a yes shows the planogram applied, a no
  // shows what is missing. The rule lives here, not only in the form: the form
  // is a convenience, this route is the record.
  if (keys.length === 0) {
    return NextResponse.json({ error: m.needPhoto }, { status: 400 });
  }

  const db = serviceClient();

  type Plan = {
    id: string | null;
    month: string | null;
    name: string | null;
    brands: string[] | null;
    brand_categories: Record<string, string> | null;
    effective_from: string | null;
    effective_to: string | null;
  };
  let plan: Plan;

  if (activityId) {
    // The campaign is read rather than trusted from the client: its name,
    // brands and month are copied onto the submission, so editing the campaign
    // later never rewrites what was reported at the time.
    const { data: activity } = await db
      .from("activities")
      .select("id, month, name, brands, brand_categories, effective_from, effective_to")
      .eq("id", activityId)
      .maybeSingle();
    if (!activity) {
      return NextResponse.json({ error: m.activityMissing }, { status: 400 });
    }
    plan = activity as unknown as Plan;
  } else {
    // No campaign: the employee names the brands. Only allowed while the month
    // has none — once the admin adds one, the entry belongs to it.
    const month = monthOf(new Date());
    const { count } = await db
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("month", month);
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: m.chooseActivity }, { status: 400 });
    }
    const picked: string[] = Array.isArray(body?.brands)
      ? [...new Set(body.brands.map((b: unknown) => String(b).trim()))] as string[]
      : [];
    if (picked.length === 0 || !picked.every(isBrand)) {
      return NextResponse.json({ error: m.chooseBrand }, { status: 400 });
    }
    plan = {
      id: null,
      month,
      name: null,
      brands: picked,
      brand_categories: brandCategories(picked),
      effective_from: null,
      effective_to: null,
    };
  }

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
      // Snapshotted with the rest of the campaign: recategorising it months
      // later must not rewrite what was already reported and exported.
      brand_categories: plan.brand_categories ?? {},
      effective_from: plan.effective_from,
      effective_to: plan.effective_to,
      display_type: displayType,
      entered: typeof body?.entered === "boolean" ? body.entered : null,
      entry_date: body?.entry_date || null,
      implementation_date: body?.implementation_date || null,
      status,
      reason_code: status === "Not Implemented" ? reasonCode : null,
      alt_store_name: null,
      note: null,
      // Only the permanent fixtures are asked, and only on a yes, so anything
      // else stores null rather than a false that would read as "no POSM fitted".
      custom_posm:
        status === "Implemented" &&
        asksCustomPosm(displayType) &&
        typeof body?.custom_posm === "boolean"
          ? body.custom_posm
          : null,
      // submitted_at is left to the database default: the phone clock is not trusted.
    })
    .select("id, submitted_at")
    .single();

  if (error) {
    console.error("submission insert failed:", error.message);
    return NextResponse.json({ error: m.saveFailed }, { status: 500 });
  }

  if (keys.length > 0) {
    // The submission is already saved. A photo row that fails to write leaves
    // the object in the bucket and the report intact, which is far better than
    // refusing a submission the employee has already made.
    const { error: photoError } = await db
      .from("photos")
      .insert(
        keys.map((r2_key: string, i: number) => ({
          submission_id: data.id,
          r2_key,
          position: i + 1,
        })),
      );
    if (photoError) console.error("photo rows failed:", photoError.message);
  }

  return NextResponse.json({
    id: data.id,
    closed: isClosing(status),
    month: plan.month,
  });
}
