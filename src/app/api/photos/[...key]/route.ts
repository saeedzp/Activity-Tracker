import { NextResponse } from "next/server";
import { currentSession } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { photoBucket } from "@/lib/r2";
import { isPhotoKey, PHOTO_TYPE } from "@/lib/photo-key";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

/**
 * Serve a photo out of the private bucket.
 *
 * The bucket has no public URL. Everyone who reaches this app is an employee
 * or an admin, so a signed-in session is the line: a photo is readable by
 * someone who is logged in, and by nobody else. A leaked key on its own opens
 * nothing.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const [session, admin] = await Promise.all([currentSession(), isAdmin()]);
  if (!session && !admin) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const key = (await params).key.join("/");
  if (!isPhotoKey(key)) return NextResponse.json({ error: "مفتاح غير صالح" }, { status: 400 });

  const bucket = photoBucket();
  if (!bucket) return NextResponse.json({ error: "رفع الصور غير مهيأ" }, { status: 503 });

  const object = await bucket.get(key);
  if (!object) return NextResponse.json({ error: "الصورة غير موجودة" }, { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": PHOTO_TYPE,
      // A photo never changes once written, and private keeps it out of any
      // shared cache between one employee and the next.
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
