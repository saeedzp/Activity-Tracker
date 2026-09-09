"use client";

import { usePathname } from "next/navigation";

/** The admin screens had no way between them but typing the URL. */
const TABS = [
  { href: "/admin/activities", label: "الاكتفيتي" },
  { href: "/admin/brands", label: "البراندات" },
  { href: "/stores", label: "أسواقك" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
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
    </nav>
  );
}
