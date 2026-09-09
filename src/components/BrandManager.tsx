"use client";

import { useState } from "react";

export interface BrandRow {
  id: string;
  name: string;
  image_url: string | null;
  color: string;
  active: boolean;
  sort_order: number;
}

const BLANK = { name: "", image_url: "", color: "#6E685C", sort_order: 100 };

/**
 * Add and edit brands.
 *
 * The image is given as a link rather than a file, so a brand can be added in
 * seconds from any image already on the web without waiting on file storage.
 * The tile previews live as the link is typed, which is the only reliable way
 * to know a link actually resolves.
 */
export function BrandManager({ initial }: { initial: BrandRow[] }) {
  const [brands, setBrands] = useState(initial);
  const [draft, setDraft] = useState({ ...BLANK });
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!draft.name.trim()) return setError("اكتب اسم البراند");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, ...(editing ? { id: editing } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "تعذّر الحفظ");
      setBrands((prev) => {
        const next = prev.filter((b) => b.id !== data.brand.id);
        return [...next, data.brand].sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
        );
      });
      setDraft({ ...BLANK });
      setEditing(null);
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setBusy(false);
    }
  }

  async function hide(id: string) {
    setBusy(true);
    await fetch(`/api/brands?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, active: false } : b)));
    setBusy(false);
  }

  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <section className="rounded-xl border border-[var(--line)] bg-white p-4">
        <h2 className="mb-1 font-bold">{editing ? "تعديل براند" : "إضافة براند"}</h2>
        <p className="mb-4 text-xs text-[var(--mute)]">
          الصورة تُوضع كرابط. انسخ رابط صورة الشعار والصقه هنا وتشوف المعاينة فوراً.
        </p>

        <div className="mb-3 grid place-items-center">
          <div className="h-24 w-24 overflow-hidden rounded-xl border border-[var(--line)]">
            {draft.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.image_url} alt="" className="h-full w-full bg-white object-contain p-2" />
            ) : (
              <span className="block h-full w-full" style={{ background: draft.color }} />
            )}
          </div>
        </div>

        <Field label="اسم البراند">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Galaxy"
            className="w-full rounded-lg border border-[var(--line)] p-2.5 text-sm"
          />
        </Field>
        <Field label="رابط الصورة (اختياري)">
          <input
            value={draft.image_url}
            onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
            placeholder="https://…"
            dir="ltr"
            className="w-full rounded-lg border border-[var(--line)] p-2.5 text-left text-sm"
          />
        </Field>
        <div className="flex gap-3">
          <Field label="اللون البديل">
            <input
              type="color"
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              className="h-10 w-16 rounded-lg border border-[var(--line)]"
            />
          </Field>
          <Field label="الترتيب">
            <input
              type="number"
              value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
              className="w-24 rounded-lg border border-[var(--line)] p-2.5 text-sm"
            />
          </Field>
        </div>

        {error && (
          <p className="mt-2 rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-xs text-[var(--warn)]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-[var(--ink)] p-3 font-bold text-white disabled:opacity-35"
        >
          {busy ? "…" : editing ? "حفظ التعديل" : "إضافة"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setDraft({ ...BLANK });
            }}
            className="mt-2 w-full rounded-xl border border-[var(--line)] p-3 text-sm font-bold"
          >
            إلغاء
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-bold">البراندات ({brands.filter((b) => b.active).length})</h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
          {brands.map((b) => (
            <div
              key={b.id}
              className={`overflow-hidden rounded-xl border bg-white ${
                b.active ? "border-[var(--line)]" : "border-dashed border-[var(--line)] opacity-45"
              }`}
            >
              {b.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.image_url} alt="" className="aspect-square w-full object-contain p-2" />
              ) : (
                <span className="block aspect-square w-full" style={{ background: b.color }} />
              )}
              <div className="border-t border-[var(--line)] p-2">
                <span className="block truncate text-xs font-bold">{b.name}</span>
                <div className="mt-1 flex gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(b.id);
                      setDraft({
                        name: b.name,
                        image_url: b.image_url ?? "",
                        color: b.color,
                        sort_order: b.sort_order,
                      });
                    }}
                    className="text-[var(--mute)] underline"
                  >
                    تعديل
                  </button>
                  {b.active && (
                    <button
                      type="button"
                      onClick={() => hide(b.id)}
                      className="text-[var(--warn)] underline"
                    >
                      إخفاء
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-[var(--mute)]">
          الإخفاء لا يحذف: الإدخالات السابقة تحمل اسم البراند، والتصدير يحتاجه.
        </p>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs text-[var(--mute)]">{label}</span>
      {children}
    </label>
  );
}
