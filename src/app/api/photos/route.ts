import { NextResponse } from "next/server";
import { currentSession } from "@/lib/session";
import { serviceClient } from "@/lib/supabase";
import { photoBucket } from "@/lib/r2";
import { MAX_PHOTO_BYTES, PHOTO_TYPE, photoKey } from "@/lib/photo-key";
import { monthOf } from "@/lib/dates";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

/**
 * Take one compressed photo and put it in the bucket.
 *
 * The photo is uploaded before the submission exists, so nothing is written to
 * the database here — the returned key is handed back with the submission and
 * recorded then. A key that is never claimed leaves an orphan object, which is
 * a few hundred kilobytes; the alternative, a submission pointing at a photo
 * that failed to upload, is a report with no evidence behind it.
 */
export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const bucket = photoBucket();
  if (!bucket) {
    console.error("photo upload attempted with no PHOTOS binding");
    return NextResponse.json({ error: "رفع الصور غير مهيأ" }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  const storeId = String(form?.get("store_id") ?? "").trim();
  const activityId = String(form?.get("activity_id") ?? "").trim();

  if (!(file instanceof File) || !storeId || !activityId) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }
  // The browser compresses before sending; this is the ceiling that makes the
  // monthly cost a number we can work out in advance.
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "الصورة كبيرة" }, { status: 413 });
  }
  if (file.type && file.type !== PHOTO_TYPE) {
    return NextResponse.json({ error: "صيغة غير مدعومة" }, { status: 400 });
  }

  // The month comes from the campaign, never from the phone: a September stand
  // photographed in October is filed under September like everything else.
  const db = serviceClient();
  const { data: activity } = await db
    .from("activities")
    .select("month")
    .eq("id", activityId)
    .maybeSingle();
  const month = (activity as { month: string | null } | null)?.month ?? monthOf(new Date());

  const key = photoKey(month, storeId, crypto.randomUUID());
  try {
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: PHOTO_TYPE },
    });
  } catch (error) {
    console.error("photo upload failed:", error);
    return NextResponse.json({ error: "تعذّر رفع الصورة" }, { status: 502 });
  }

  return NextResponse.json({ key, bytes: file.size });
}
