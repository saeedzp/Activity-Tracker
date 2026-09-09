"use client";

import { useState } from "react";
import { formatMonthAr } from "@/lib/dates";

export interface ActivityRow {
  id: string;
  month: string;
  name: string;
  brands: string[];
  active: boolean;
  sort_order: number;
}

/**
 * The month's campaigns.
 *
 * An activity is a campaign — "العودة للمدارس" — and the brands it carries.
 * The size it arrives on is not planned here: the employee reports the size
 * actually delivered, which is not always the size intended.
 */
export function ActivityManager({
  month,
  initial,
}: {
  month: string;
  initial: ActivityRow[];
}) {
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [brandDraft, setBrandDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function addBrand() {
    const value = brandDraft.trim();
    if (!value) return;
    if (!brands.includes(value)) setBrands([...brands, value]);
    setBrandDraft("");
  }

  function clear() {
    setName("");
    setBrands([]);
    setBrandDraft("");
    setEditing(null);
  }

  async function save() {
    if (!name.trim()) return setError("اكتب اسم الاكتفيتي");
    if (brands.length === 0) return setError("أضف براند واحد على الأقل");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month, name: name.trim(), brands, ...(editing ? { id: editing } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "تعذّر الحفظ");
      setRows((prev) =>
        [...prev.filter((r) => r.id !== data.activity.id), data.activity].sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ar"),
        ),
      );
      clear();
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setBusy(false);
    }
  }

  async function hide(id: string) {
    setBusy(true);
    await fetch(`/api/activities?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, active: false } : r)));
    setBusy(false);
  }

  const live = rows.filter((r) => r.active);

  return (
    <div className="grid gap-6 md:grid-cols-[340px_1fr]">
      <section className="rounded-xl border border-[var(--line)] bg-white p-4">
        <h2 className="mb-1 font-bold">{editing ? "تعديل اكتفيتي" : "إضافة اكتفيتي"}</h2>
        <p className="mb-4 text-xs text-[var(--mute)]">
          اسم الحملة والبراندات اللي تحملها. المقاس يختاره الموظف حسب اللي وصل فعلاً.
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-[var(--mute)]">اسم الاكتفيتي</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="العودة للمدارس"
            className="w-full rounded-lg border border-[var(--line)] p-2.5 text-sm"
          />
        </label>

        <label className="mb-2 block">
          <span className="mb-1 block text-xs text-[var(--mute)]">البراندات</span>
          <div className="flex gap-2">
            <input
              value={brandDraft}
              onChange={(e) => setBrandDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addBrand();
                }
              }}
              placeholder="تويكس ثم Enter"
              className="w-full rounded-lg border border-[var(--line)] p-2.5 text-sm"
            />
            <button
              type="button"
              onClick={addBrand}
              className="rounded-lg border border-[var(--line)] px-3 text-lg font-bold"
            >
              +
            </button>
          </div>
        </label>

        {brands.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {brands.map((b) => (
              <span
                key={b}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--ink)] px-2.5 py-1 text-xs font-bold text-white"
              >
                {b}
                <button
                  type="button"
                  onClick={() => setBrands(brands.filter((x) => x !== b))}
                  aria-label={`حذف ${b}`}
                  className="opacity-70"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-2 rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-xs text-[var(--warn)]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-[var(--ink)] p-3 font-bold text-white disabled:opacity-35"
        >
          {busy ? "…" : editing ? "حفظ التعديل" : "إضافة"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={clear}
            className="mt-2 w-full rounded-xl border border-[var(--line)] p-3 text-sm font-bold"
          >
            إلغاء
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-bold">
          اكتفيتي {formatMonthAr(month)} ({live.length})
        </h2>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--mute)]">
            ما فيه اكتفيتي لهذا الشهر. أضف أول واحد من اليمين.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className={`rounded-xl border bg-white p-3.5 ${
                  r.active ? "border-[var(--line)]" : "border-dashed border-[var(--line)] opacity-45"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <b className="block">{r.name}</b>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.brands.map((b) => (
                        <span
                          key={b}
                          className="rounded-md bg-[var(--paper)] px-2 py-0.5 text-xs font-bold"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-none gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(r.id);
                        setName(r.name);
                        setBrands(r.brands);
                      }}
                      className="text-[var(--mute)] underline"
                    >
                      تعديل
                    </button>
                    {r.active && (
                      <button
                        type="button"
                        onClick={() => hide(r.id)}
                        className="text-[var(--warn)] underline"
                      >
                        إخفاء
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-[var(--mute)]">
          الإخفاء لا يحذف — الإدخالات السابقة تشير للاكتفيتي والسجل يحتاجه.
        </p>
      </section>
    </div>
  );
}
