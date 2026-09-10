import { NextResponse } from "next/server";
import { currentSession } from "@/lib/session";
import { isAdmin } from "@/lib/admin";
import { photoBucket } from "@/lib/r2";
import { isPlanogramKey, PLANOGRAM_TYPE } from "@/lib/planogram";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

/**
 * Serve a planogram to whoever is signed in.
 *
 * Employees need it open on the phone while they build the stand, so an
 * employee session is enough — but the bucket has no public URL, so the file
 * does not travel further than the people using the app.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const [session, admin] = await Promise.all([currentSession(), isAdmin()]);
  if (!session && !admin) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const key = (await params).key.join("/");
  if (!isPlanogramKey(key)) return NextResponse.json({ error: "Invalid key" }, { status: 400 });

  const bucket = photoBucket();
  if (!bucket) return NextResponse.json({ error: "File storage is not set up" }, { status: 503 });

  const object = await bucket.get(key);
  if (!object) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new Response(object.body, {
    headers: {
      "content-type": PLANOGRAM_TYPE,
      // Opens in the phone's viewer rather than downloading: the employee is
      // reading it, not filing it.
      "content-disposition": "inline",
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
