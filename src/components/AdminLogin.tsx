"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";

export function AdminLogin({ next }: { next: string }) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!passcode.trim()) return setError("اكتب الرقم السري");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر الدخول");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center p-5">
      <div className="mb-6 flex flex-col items-center gap-3">
        <Logo size={56} />
        <span className="font-bold">شاشات الإدارة</span>
      </div>

      <form onSubmit={submit}>
        <label className="mb-1.5 block text-sm text-[var(--mute)]">الرقم السري</label>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full rounded-xl border border-[var(--line)] bg-white p-3.5 text-center tracking-[0.4em] outline-none focus:border-[var(--amber)]"
        />
        {error && (
          <p className="mt-3 rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-[var(--ink)] p-3.5 font-bold text-white disabled:opacity-35"
        >
          {busy ? "لحظة…" : "دخول"}
        </button>
      </form>

      <a href="/stores" className="mt-6 text-center text-sm text-[var(--mute)] underline">
        رجوع لشاشة الموظف
      </a>
    </main>
  );
}
