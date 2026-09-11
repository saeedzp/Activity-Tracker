"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { LanguageToggle } from "./LanguageToggle";
import { dirOf, t, type Lang } from "@/lib/i18n";

export function LoginForm({ lang }: { lang: Lang }) {
  const router = useRouter();
  const s = t(lang).login;
  const [empId, setEmpId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!empId.trim()) return setError(s.empty);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emp_id: empId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? s.failed);
        return;
      }
      router.push("/stores");
      router.refresh();
    } catch {
      setError(s.offline);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      dir={dirOf(lang)}
      className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center p-5"
    >
      <div className="mb-6 flex flex-col items-center gap-3">
        <Logo size={72} />
        <span className="text-lg font-bold">Activity Tracker</span>
        <LanguageToggle lang={lang} tone="light" />
      </div>

      <h1 className="mb-1 text-xl font-bold">{s.title}</h1>
      <p className="mb-6 text-sm text-[var(--mute)]">{s.hint}</p>

      <form onSubmit={submit}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={empId}
          onChange={(e) => setEmpId(e.target.value)}
          placeholder={s.placeholder}
          className="w-full rounded-xl border border-[var(--line)] bg-white p-3.5 outline-none focus:border-[var(--amber)]"
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
          {busy ? s.busy : s.submit}
        </button>
      </form>
    </main>
  );
}
