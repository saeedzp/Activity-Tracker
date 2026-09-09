import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { currentSession } from "@/lib/session";
import { linkToPlan, monthOf, previousMonth, type PlannedActivity } from "@/lib/plan-link";
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
 * latest row per store/brand/display type is the current state.
 */
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const storeId = String(body?.store_id ?? "").trim();
  const brand = String(body?.brand ?? "").trim();
  const displayType = String(body?.display_type ?? "").trim();
  const status = String(body?.status ?? "").trim() as Status;
  const reasonCode = body?.reason_code ? String(body.reason_code).trim() : null;
  const altStoreName = body?.alt_store_name ? String(body.alt_store_name).trim() : null;

  if (!storeId || !brand || !displayType) {
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

  const db = serviceClient();

  // Only this month's and last month's plans can match, so the lookup stays
  // small however many months of history accumulate.
  const thisMonth = monthOf(new Date());
  const { data: plans } = await db
    .from("activities")
    .select("id, month, planned_store_id, brand, display_type")
    .in("month", [thisMonth, previousMonth(thisMonth)])
    .eq("planned_store_id", storeId)
    .eq("brand", brand)
    .eq("display_type", displayType);

  const link = linkToPlan(
    { storeId, brand, displayType },
    (plans ?? []) as unknown as PlannedActivity[],
  );

  const { data, error } = await db
    .from("submissions")
    .insert({
      store_id: storeId,
      emp_id: session.empId,
      // Found rather than demanded: the employee records freely, and the line
      // is attached to the plan when one answers to it.
      activity_id: link.activity_id,
      month: link.month,
      brand,
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

  return NextResponse.json({
    id: data.id,
    closed: isClosing(status),
    month: link.month,
    offPlan: link.offPlan,
  });
}
