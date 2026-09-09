import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { SESSION_COOKIE, SESSION_MAX_AGE, encodeSession } from "@/lib/session";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

/** Sign in with an employee number. No password: the number is the credential. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const empId = String(body?.emp_id ?? "").trim();
  if (!empId) {
    return NextResponse.json({ error: "اكتب رقمك الوظيفي" }, { status: 400 });
  }

  const db = serviceClient();
  const { data, error } = await db
    .from("users")
    .select("emp_id, name, role, active")
    .eq("emp_id", empId)
    .maybeSingle();

  if (error) {
    // A rejected key is a deployment problem, not something the employee can
    // retry their way out of, so it must not be dressed up as a network blip.
    const rejectedKey = /jwt|api key|unauthor/i.test(error.message);
    console.error("login query failed:", error.message);
    return NextResponse.json(
      {
        error: rejectedKey
          ? "إعداد الخادم غير صحيح — راجع المسؤول"
          : "تعذّر الاتصال، حاول مرة ثانية",
      },
      { status: rejectedKey ? 503 : 500 },
    );
  }
  // A disabled employee is refused with the same wording as an unknown number,
  // so the screen never confirms which numbers exist.
  if (!data || !data.active) {
    return NextResponse.json({ error: "الرقم غير موجود" }, { status: 404 });
  }

  const response = NextResponse.json({
    emp_id: data.emp_id,
    name: data.name,
    role: data.role,
  });
  response.cookies.set(SESSION_COOKIE, await encodeSession({
    empId: data.emp_id,
    role: data.role,
    name: data.name,
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
