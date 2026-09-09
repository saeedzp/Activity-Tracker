"use client";

import { useRouter } from "next/navigation";

/** Top bar: who is signed in, and the way out. */
export function AppBar({ name }: { name: string }) {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-[var(--ink)] px-4 py-3 text-[var(--paper)]">
      <span className="flex items-center gap-2 font-bold">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--amber)]" />
        متابعة الاستاندات
      </span>
      <span className="flex items-center gap-3">
        <span className="text-xs opacity-75">{name}</span>
        <button type="button" onClick={signOut} className="text-xs underline opacity-75">
          خروج
        </button>
      </span>
    </header>
  );
}
