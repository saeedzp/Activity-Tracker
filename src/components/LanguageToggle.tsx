"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANG_NAME, otherLang, type Lang } from "@/lib/i18n";

/**
 * Switch the employee app between Arabic and English.
 *
 * The choice goes in a cookie, not in browser storage: these pages are
 * rendered on the server, and the server has to know which way the page reads
 * before it sends any HTML. Writing it from here and refreshing re-renders the
 * whole page in the other language and direction in one step.
 */
export function LanguageToggle({ lang, tone = "dark" }: { lang: Lang; tone?: "dark" | "light" }) {
  const router = useRouter();
  const next = otherLang(lang);

  function switchTo() {
    // A year, and site-wide, so it survives closing the app.
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={switchTo}
      // Named in the language it switches to, so it reads as an offer rather
      // than a label for where you already are.
      lang={next}
      dir={next === "ar" ? "rtl" : "ltr"}
      className={`text-xs underline ${tone === "dark" ? "opacity-75" : "text-[var(--mute)]"}`}
    >
      {LANG_NAME[next]}
    </button>
  );
}
