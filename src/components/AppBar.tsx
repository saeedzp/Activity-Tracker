"use client";

import { useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { LanguageToggle } from "./LanguageToggle";
import { dirOf, t, type Lang } from "@/lib/i18n";

/** Top bar: who is signed in, and the way out. */
export function AppBar({ name, lang }: { name: string; lang: Lang }) {
  const router = useRouter();
  const s = t(lang).appBar;

  async function signOut() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <header
      dir={dirOf(lang)}
      className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-[var(--ink)] px-4 py-3 text-[var(--paper)]"
    >
      <span className="flex items-center gap-2 font-bold">
        <Logo size={22} />
        Activity Tracker
      </span>
      <span className="flex items-center gap-3">
        <span className="text-xs opacity-75">{name}</span>
        <LanguageToggle lang={lang} />
        <button type="button" onClick={signOut} className="text-xs underline opacity-75">
          {s.signOut}
        </button>
      </span>
    </header>
  );
}
