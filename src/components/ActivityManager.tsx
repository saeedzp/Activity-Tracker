"use client";

import { useRef, useState } from "react";
import { formatMonthEn } from "@/lib/dates";
import { preparePhoto, THUMB_QUALITY, THUMB_WIDTH } from "@/lib/photo";

export interface ActivityRow {
  id: string;
  month: string;
  name: string;
  brands: string[];
  image: string | null;
  active: boolean;
  sort_order: number;
}

/**
 * The month's campaigns.
 *
 * An activity is a campaign — "Back to School" — and the brands it carries.
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
  const [image, setImage] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
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
    setImage(null);
    setEditing(null);
    if (imageInput.current) imageInput.current.value = "";
  }

  /**
   * Shrunk to a thumbnail here, in the browser, before it is ever sent.
   * The picture rides inside the activity row, and a raw camera photo would
   * make every employee download several megabytes to read a list.
   */
  async function chooseImage(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const prepared = await preparePhoto(file, THUMB_WIDTH, THUMB_QUALITY);
      setImage(prepared.dataUrl);
    } catch {
      setError("Could not process that image, try another");
    }
  }

  async function save() {
    if (!name.trim()) return setError("Enter the activity name");
    if (brands.length === 0) return setError("Add at least one brand");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          month,
          name: name.trim(),
          brands,
          image,
          ...(editing ? { id: editing } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not save");
      setRows((prev) =>
        [...prev.filter((r) => r.id !== data.activity.id), data.activity].sort(
          (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ar"),
        ),
      );
      clear();
    } catch {
      setError("Could not connect");
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
        <h2 className="mb-1 font-bold">{editing ? "Edit activity" : "Add activity"}</h2>
        <p className="mb-4 text-xs text-[var(--mute)]">
          The campaign name and the brands it carries. The size is not planned
          here: the employee reports the one that actually arrived.
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-[var(--mute)]">Activity name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Back to School"
            dir="ltr"
            className="w-full rounded-lg border border-[var(--line)] p-2.5 text-sm"
          />
          <span className="mt-1 block text-[11px] text-[var(--mute)]">
            As Mars sends it. This name goes into the export and becomes the
            photo folder.
          </span>
        </label>

        <label className="mb-2 block">
          <span className="mb-1 block text-xs text-[var(--mute)]">Brands</span>
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
              placeholder="Twix, then Enter"
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
                  aria-label={`Remove ${b}`}
                  className="opacity-70"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mb-3">
          <span className="mb-1 block text-xs text-[var(--mute)]">Activity photo (optional)</span>
          <div className="flex items-center gap-3">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                className="h-16 w-16 flex-none rounded-lg border border-[var(--line)] object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 flex-none place-items-center rounded-lg border border-dashed border-[var(--line)] text-[10px] text-[var(--mute)]">
                No photo
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-bold"
              >
                {image ? "Change photo" : "Choose photo"}
              </button>
              {image && (
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    if (imageInput.current) imageInput.current.value = "";
                  }}
                  className="text-xs text-[var(--warn)] underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => chooseImage(e.target.files?.[0])}
          />
          <p className="mt-1.5 text-[11px] text-[var(--mute)]">
            Shrunk automatically before saving, so the employee can tell the
            campaigns apart without a heavy download.
          </p>
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
          className="mt-3 w-full rounded-xl bg-[var(--ink)] p-3 font-bold text-white disabled:opacity-35"
        >
          {busy ? "…" : editing ? "Save changes" : "Add"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={clear}
            className="mt-2 w-full rounded-xl border border-[var(--line)] p-3 text-sm font-bold"
          >
            Cancel
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-bold">
          {formatMonthEn(month)} ({live.length})
        </h2>

        {rows.length === 0 ? (
          <p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--mute)]">
            No activities for this month yet. Add the first one on the left.
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
                  <div className="flex items-start gap-3">
                    {r.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.image}
                        alt=""
                        className="h-12 w-12 flex-none rounded-lg border border-[var(--line)] object-cover"
                      />
                    )}
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
                  </div>
                  <div className="flex flex-none gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(r.id);
                        setName(r.name);
                        setBrands(r.brands);
                        setImage(r.image);
                      }}
                      className="text-[var(--mute)] underline"
                    >
                      Edit
                    </button>
                    {r.active && (
                      <button
                        type="button"
                        onClick={() => hide(r.id)}
                        className="text-[var(--warn)] underline"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-[var(--mute)]">
          Hiding does not delete: past submissions point at the activity and
          the history still needs it.
        </p>
      </section>
    </div>
  );
}
