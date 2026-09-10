"use client";

import { useMemo, useState } from "react";
import { displayTypeAr, reasonAr, statusAr, type Status } from "@/lib/domain";
import { formatDateAr, formatMonthAr } from "@/lib/dates";

export interface HistoryRow {
  id: string;
  month: string | null;
  store_id: string;
  emp_id: string;
  activity_name: string | null;
  brands: string[] | null;
  display_type: string;
  entered: boolean | null;
  entry_date: string | null;
  implementation_date: string | null;
  status: string;
  reason_code: string | null;
  alt_store_name: string | null;
  note: string | null;
  custom_posm: boolean | null;
  activity_id: string | null;
  submitted_at: string | null;
  approved: boolean;
}

/** One stored photo, joined to the submission that claimed it. */
export interface PhotoRow {
  submission_id: string;
  r2_key: string;
}

export interface StoreName {
  id: string;
  name: string | null;
  account: string | null;
  city: string | null;
}

/** Every column, in the order the report reads. */
const COLUMNS = [
  "الشهر", "السوق", "الأكاونت", "المدينة", "الاكتفيتي", "البراندات", "المقاس",
  "دخل الاستاند", "تاريخ الدخول", "الحالة", "السبب", "تفاصيل السبب",
  "السوق الفعلي", "مواد دعائية", "ضمن الخطة", "الموظف", "تاريخ الإرسال", "الصور",
] as const;

/** The photo cell, so the table and the export agree on which column it is. */
const PHOTOS_COLUMN = COLUMNS.length - 1;

export function photoUrl(key: string): string {
  return `/api/photos/${key}`;
}

export function HistoryTable({
  rows,
  stores,
  photos,
  months,
  month,
}: {
  rows: HistoryRow[];
  stores: StoreName[];
  photos: PhotoRow[];
  months: string[];
  month: string;
}) {
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const photosOf = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const photo of photos) {
      const list = map.get(photo.submission_id);
      if (list) list.push(photo.r2_key);
      else map.set(photo.submission_id, [photo.r2_key]);
    }
    return map;
  }, [photos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const store = byId.get(r.store_id);
      return (
        (store?.name ?? "").toLowerCase().includes(q) ||
        r.store_id.toLowerCase().includes(q) ||
        (r.activity_name ?? "").toLowerCase().includes(q) ||
        (r.brands ?? []).some((b) => b.toLowerCase().includes(q)) ||
        (store?.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, byId]);

  /**
   * One row per column, in the same order the table shows.
   *
   * Every field is read defensively. The history reaches back over rows
   * written by older versions of the app, and one row from before a column
   * existed used to throw while rendering — which takes down the whole admin
   * page, not just that line. A blank cell beats a 500.
   */
  function cells(row: HistoryRow): string[] {
    const store = byId.get(row.store_id);
    return [
      formatMonthAr(row.month),
      store?.name ?? row.store_id,
      store?.account ?? "",
      store?.city ?? "",
      row.activity_name ?? "—",
      (row.brands ?? []).join(" · "),
      displayTypeAr(row.display_type),
      row.entered === null ? "—" : row.entered ? "نعم" : "لا",
      formatDateAr(row.entry_date ?? row.implementation_date),
      statusAr(row.status as Status),
      row.reason_code ? reasonAr(row.reason_code) : "—",
      row.note ?? "—",
      row.alt_store_name ?? "—",
      row.custom_posm === null ? "—" : row.custom_posm ? "نعم" : "لا",
      row.activity_id ? "نعم" : "خارج الخطة",
      row.emp_id,
      formatDateAr(row.submitted_at?.slice(0, 10) ?? null),
      // The export carries the addresses, not the pictures: whoever opens the
      // CSV can follow them, and the file stays a file.
      (photosOf.get(row.id) ?? []).map(photoUrl).join(" "),
    ];
  }

  function download() {
    const lines = [COLUMNS.join(",")];
    for (const row of filtered) {
      lines.push(
        cells(row)
          .map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c))
          .join(","),
      );
    }
    // The BOM makes Excel read the Arabic as UTF-8 rather than mojibake.
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `history-${month || "all"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="tab" value="history" />
        <label className="text-sm">
          <span className="mb-1 block text-xs text-[var(--mute)]">الشهر</span>
          <select
            name="month"
            defaultValue={month}
            className="rounded-lg border border-[var(--line)] bg-white p-2 text-sm"
          >
            <option value="">كل الشهور</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonthAr(m)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold"
        >
          عرض
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالسوق أو الاكتفيتي أو البراند"
          className="min-w-[220px] flex-1 rounded-lg border border-[var(--line)] bg-white p-2 text-sm"
        />
        <button
          type="button"
          onClick={download}
          disabled={filtered.length === 0}
          className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-bold text-white disabled:opacity-35"
        >
          تصدير {filtered.length}
        </button>
      </form>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--mute)]">
          ما فيه إدخالات{month ? ` في ${formatMonthAr(month)}` : ""} بعد.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
          <table className="w-full min-w-[1400px] border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--paper)]">
                {COLUMNS.map((c) => (
                  <th
                    key={c}
                    className="whitespace-nowrap border-b border-[var(--line)] px-3 py-2 text-right font-bold"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const values = cells(row);
                return (
                  <tr key={row.id} className="align-top">
                    {values.map((value, index) => (
                      <td
                        key={index}
                        className={`border-b border-[var(--line)] px-3 py-2 ${
                          index === 14 && !row.activity_id
                            ? "font-bold text-[var(--amber)]"
                            : index === 9
                              ? "whitespace-nowrap font-bold"
                              : "whitespace-nowrap"
                        }`}
                      >
                        {index === PHOTOS_COLUMN ? (
                          <PhotoCell keys={photosOf.get(row.id) ?? []} />
                        ) : (
                          value
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * The photos as thumbnails that open full size.
 *
 * They load from the app rather than the bucket, which has no public URL, so a
 * row of the history is readable only by someone already signed in.
 */
function PhotoCell({ keys }: { keys: string[] }) {
  if (keys.length === 0) return <span className="text-[var(--mute)]">—</span>;
  return (
    <span className="flex gap-1">
      {keys.map((key) => (
        <a key={key} href={photoUrl(key)} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoUrl(key)}
            alt="صورة الإدخال"
            loading="lazy"
            className="h-10 w-10 rounded-md border border-[var(--line)] object-cover"
          />
        </a>
      ))}
    </span>
  );
}
