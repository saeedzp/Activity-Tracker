"use client";

import { usePathname, useRouter } from "next/navigation";

/** The admin screens had no way between them but typing the URL. */
const TABS = [
  { href: "/admin/activities", label: "الاكتفيتي" },
  { href: "/admin/route", label: "الروت" },
  { href: "/admin/history", label: "السجل" },
  { href: "/stores", label: "أسواقك" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function lock() {
    await fetch("/api/admin-login", { method: "DELETE" });
    router.push("/stores");
    router.refresh();
  }

  return (
    <nav className="mb-5 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <a
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
              active
                ? "bg-[var(--ink)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--ink)]"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
      <button
        type="button"
        onClick={lock}
        className="mr-auto rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-sm text-[var(--mute)]"
      >
        قفل الإدارة
      </button>
    </nav>
  );
}
