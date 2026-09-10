"use client";

import { useRouter } from "next/navigation";
import { TABS, type TabKey } from "@/lib/admin-tabs";

export function AdminTabs({ active }: { active: TabKey }) {
  const router = useRouter();

  async function lock() {
    await fetch("/api/admin-login", { method: "DELETE" });
    router.push("/stores");
    router.refresh();
  }

  return (
    <nav className="mb-5 border-b border-[var(--line)]">
      <div className="flex flex-wrap items-center gap-1">
        {TABS.map((tab) => {
          const on = tab.key === active;
          return (
            <a
              key={tab.key}
              href={`/admin?tab=${tab.key}`}
              aria-current={on ? "page" : undefined}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold ${
                on
                  ? "border-[var(--ink)] text-[var(--ink)]"
                  : "border-transparent text-[var(--mute)]"
              }`}
            >
              {tab.label}
            </a>
          );
        })}
        <div className="ms-auto flex items-center gap-3 pb-2">
          <a href="/stores" className="text-xs text-[var(--mute)] underline">
            Employee app
          </a>
          <button type="button" onClick={lock} className="text-xs text-[var(--mute)] underline">
            Lock admin
          </button>
        </div>
      </div>
    </nav>
  );
}
