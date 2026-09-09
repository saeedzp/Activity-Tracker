import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { SESSION_COOKIE, SESSION_MAX_AGE, encodeSession } from "@/lib/session";

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
    return NextResponse.json({ error: "تعذّر الاتصال، حاول مرة ثانية" }, { status: 500 });
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
  response.cookies.set(SESSION_COOKIE, encodeSession({
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
