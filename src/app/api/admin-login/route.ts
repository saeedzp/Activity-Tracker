import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_MAX_AGE,
  adminCookieValue,
  checkPasscode,
  passcodeConfigured,
} from "@/lib/admin";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

export async function POST(request: Request) {
  if (!(await passcodeConfigured())) {
    return NextResponse.json({ error: "The passcode is not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const given = String(body?.passcode ?? "");
  if (!(await checkPasscode(given))) {
    // A short pause blunts guessing without making a correct entry feel slow.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  const cookieValue = await adminCookieValue();
  if (!cookieValue) {
    return NextResponse.json({ error: "Setup incomplete" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
