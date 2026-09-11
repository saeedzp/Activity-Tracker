"use client";

import { useRef, useState } from "react";
import { formatDateEn, formatMonthEn } from "@/lib/dates";
import { formatBytesEn } from "@/lib/photo";
import { MAX_PLANOGRAM_BYTES } from "@/lib/planogram";

export interface PlanogramRow {
  id: string;
  activity_id: string;
  month: string | null;
  title: string | null;
  r2_key: string;
  bytes: number | null;
  created_at: string | null;
}

export interface ActivityOption {
  id: string;
  name: string;
}

/**
 * The month's planograms, and the archive of every month before it.
 *
 * One drawing per campaign — it arrives showing every stand in it, and the
 * employee finds theirs inside. It is kept rather than consumed: "what did
 * September's stand look like" gets asked long after September, so the list
 * below the form reaches across every month, not only the one on screen.
 */
export function PlanogramManager({
  month,
  activities,
  rows,
  activityNames,
}: {
  month: string;
  activities: ActivityOption[];
  rows: PlanogramRow[];
  activityNames: Record<string, string>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [list, setList] = useState(rows);
  const [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function upload(file: File) {
    if (!activityId) return setError("Add an activity for this month first");
    if (file.size > MAX_PLANOGRAM_BYTES) {
      return setError(`File too large — up to ${formatBytesEn(MAX_PLANOGRAM_BYTES)}`);
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("activity_id", activityId);
      form.append("title", title.trim());
      const res = await fetch("/api/planograms", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Could not upload");
      setList((prev) => [data.planogram as PlanogramRow, ...prev]);
      setTitle("");
    } catch {
      setError("Could not connect");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/planograms?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setList((prev) => prev.filter((r) => r.id !== id));
    setBusy(false);
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? list.filter((r) =>
        [activityNames[r.activity_id] ?? "", r.title ?? "", r.month ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : list;

  return (
    <div className="grid gap-6 md:grid-cols-[340px_1fr]">
      <section className="rounded-xl border border-[var(--line)] bg-white p-4">
        <h2 className="mb-1 font-bold">Add planogram</h2>
        <p className="mb-4 text-xs text-[var(--mute)]">
          A PDF of the stands and the SKUs on them, for {formatMonthEn(month)}.
          The employee opens it before choosing a size.
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-[var(--mute)]">Activity</span>
          <select
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
            className="w-full rounded-lg border border-[var(--line)] bg-white p-2.5 text-sm"
          >
            {activities.length === 0 && <option value="">No activities this month</option>}
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs text-[var(--mute)]">Title (optional)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Front shelf layout"
            className="w-full rounded-lg border border-[var(--line)] p-2.5 text-sm"
          />
        </label>

        {error && (
          <p className="mb-3 rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-xs text-[var(--warn)]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy || activities.length === 0}
          className="w-full rounded-xl bg-[var(--ink)] p-3 font-bold text-white disabled:opacity-35"
        >
          {busy ? "…" : "Choose PDF"}
        </button>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }}
        />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">All planograms ({filtered.length})</h2>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity, title or month"
            className="min-w-[220px] rounded-lg border border-[var(--line)] bg-white p-2 text-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--mute)]">
            No planograms yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-white p-3.5"
              >
                <span className="text-2xl">📄</span>
                <div className="min-w-0 flex-1">
                  <b className="block">{activityNames[r.activity_id] ?? "—"}</b>
                  <span className="text-xs text-[var(--mute)]">
                    {formatMonthEn(r.month)}
                    {r.title ? ` · ${r.title}` : ""}
                    {r.bytes ? ` · ${formatBytesEn(r.bytes)}` : ""} ·{" "}
                    {/* Read defensively: one row missing a field must not take
                        down the whole admin page. */}
                    {formatDateEn(r.created_at?.slice(0, 10) ?? null)}
                  </span>
                </div>
                <a
                  href={`/api/planograms/${r.r2_key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-bold"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="text-xs text-[var(--warn)] underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-[var(--mute)]">
          The list spans every month, so a planogram stays findable long after
          its campaign has ended.
        </p>
      </section>
    </div>
  );
}
