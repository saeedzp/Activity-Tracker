"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GRID_COLUMNS,
  changedRows,
  coerceCell,
  duplicateKeys,
  emptyDraft,
  isRowEmpty,
  parseClipboard,
  validateRow,
  type ActivityDraft,
  type GridColumnKey,
} from "@/lib/grid";
import { BRANDS, DISPLAY_TYPES } from "@/lib/domain";
import { StorePicker, type StoreOption } from "./StorePicker";

interface Props {
  month: string;
  initialRows: ActivityDraft[];
  stores: StoreOption[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

let rowCounter = 0;
const newKey = () => `new:${++rowCounter}`;

export function ActivityGrid({ month, initialRows, stores }: Props) {
  const [rows, setRows] = useState<ActivityDraft[]>(() =>
    initialRows.length > 0 ? initialRows : [emptyDraft(month, newKey())],
  );
  const [saved, setSaved] = useState(
    () => new Map(initialRows.map((r) => [r.key, { ...r }])),
  );
  const [deleted, setDeleted] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<{ key: string; column: GridColumnKey } | null>(null);
  const [picker, setPicker] = useState<string | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  const storeById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const dupes = useMemo(() => duplicateKeys(rows), [rows]);

  const errorsByRow = useMemo(() => {
    const map = new Map<string, ReturnType<typeof validateRow>>();
    for (const row of rows) {
      if (!isRowEmpty(row)) map.set(row.key, validateRow(row));
    }
    return map;
  }, [rows]);

  const pending = useMemo(() => changedRows(rows, saved), [rows, saved]);

  /* ------------------------------------------------------------- mutation */

  const patch = useCallback((key: string, changes: Partial<ActivityDraft>) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...changes } : r)),
    );
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, emptyDraft(month, newKey())]);
  }, [month]);

  const duplicateRow = useCallback((key: string) => {
    setRows((prev) => {
      const at = prev.findIndex((r) => r.key === key);
      if (at < 0) return prev;
      const copy: ActivityDraft = { ...prev[at], key: newKey(), id: undefined };
      return [...prev.slice(0, at + 1), copy, ...prev.slice(at + 1)];
    });
  }, []);

  const removeRows = useCallback((keys: Set<string>) => {
    setRows((prev) => {
      const kept = prev.filter((r) => !keys.has(r.key));
      // Saved rows must be deleted server-side too, not just dropped locally.
      const ids = prev.filter((r) => keys.has(r.key) && r.id).map((r) => r.id!);
      if (ids.length) setDeleted((d) => [...d, ...ids]);
      return kept.length > 0 ? kept : [emptyDraft(month, newKey())];
    });
    setSelected(new Set());
  }, [month]);

  /** Apply one value to every selected row — the bulk-fill action. */
  const fillSelected = useCallback(
    (column: GridColumnKey, value: string) => {
      setRows((prev) =>
        prev.map((r) => (selected.has(r.key) ? { ...r, [column]: value } : r)),
      );
    },
    [selected],
  );

  /* ---------------------------------------------------------------- paste */

  /**
   * Spread a clipboard block starting at the focused cell, growing the grid
   * downward and rightward as needed, exactly like a spreadsheet.
   */
  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      if (!active) return;
      const text = event.clipboardData.getData("text/plain");
      if (!text.includes("\t") && !text.includes("\n")) return; // single cell: let it be
      event.preventDefault();

      const block = parseClipboard(text);
      const startRow = rows.findIndex((r) => r.key === active.key);
      const startCol = GRID_COLUMNS.findIndex((c) => c.key === active.column);
      if (startRow < 0 || startCol < 0) return;

      setRows((prev) => {
        const next = [...prev];
        while (next.length < startRow + block.length) {
          next.push(emptyDraft(month, newKey()));
        }
        block.forEach((cells, r) => {
          const target = { ...next[startRow + r] };
          cells.forEach((raw, c) => {
            const column = GRID_COLUMNS[startCol + c];
            if (!column) return;
            const value = coerceCell(column.key, raw);
            // A value the column cannot accept is dropped rather than stored
            // as text the export would later choke on.
            if (value !== null) (target as Record<string, unknown>)[column.key] = value;
          });
          next[startRow + r] = target;
        });
        return next;
      });
      setMessage(`تم لصق ${block.length} صف`);
    },
    [active, rows, month],
  );

  /* ----------------------------------------------------------------- save */

  const save = useCallback(async () => {
    if (pending.length === 0 && deleted.length === 0) return;
    setState("saving");
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ month, rows: pending, deleted }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setMessage(data.error ?? "تعذّر الحفظ");
        return;
      }
      setDeleted([]);
      setSaved((prev) => {
        const next = new Map(prev);
        for (const row of pending) next.set(row.key, { ...row });
        return next;
      });
      setState("saved");
      const rejected = data.rejected?.length ?? 0;
      setMessage(rejected > 0 ? `حُفظ، و${rejected} سطر ناقص ما انحفظ` : "تم الحفظ");
    } catch {
      setState("error");
      setMessage("تعذّر الاتصال");
    }
  }, [pending, deleted, month]);

  // Autosave a moment after typing stops, so there is no save button to forget.
  useEffect(() => {
    if (pending.length === 0 && deleted.length === 0) return;
    const timer = setTimeout(save, 1200);
    return () => clearTimeout(timer);
  }, [pending, deleted, save]);

  // Warn before losing edits that have not reached the server yet.
  useEffect(() => {
    const unsaved = pending.length > 0 || deleted.length > 0;
    if (!unsaved) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pending, deleted]);

  /* ----------------------------------------------------------------- view */

  const allSelected = selected.size > 0 && selected.size === rows.length;
  const linked = rows.filter((r) => !isRowEmpty(r) && r.planned_store_id).length;
  const unlinked = rows.filter((r) => !isRowEmpty(r) && !r.planned_store_id).length;
  const weak = rows.filter(
    (r) => r.match_method === "fuzzy" && (r.match_score ?? 1) < 0.8,
  ).length;

  return (
    <div className="grid-shell" onPaste={handlePaste}>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Stat label="مربوط" value={linked} tone="ok" />
        <Stat label="مطابقة ضعيفة" value={weak} tone="warn" />
        <Stat label="غير مربوط" value={unlinked} tone="bad" />
        <span className="mr-auto text-[var(--mute)]">
          {state === "saving" && "جارٍ الحفظ…"}
          {state === "saved" && message}
          {state === "error" && <span className="text-[var(--warn)]">{message}</span>}
          {state === "idle" && pending.length > 0 && `${pending.length} تعديل غير محفوظ`}
        </span>
      </div>

      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          onFill={fillSelected}
          onDelete={() => removeRows(selected)}
          onClear={() => setSelected(new Set())}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--paper)]">
              <th className="w-9 border-b border-[var(--line)] p-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(rows.map((r) => r.key)) : new Set())
                  }
                />
              </th>
              {GRID_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  style={{ minWidth: col.width }}
                  className="border-b border-[var(--line)] p-2 text-right font-bold"
                >
                  {col.label}
                </th>
              ))}
              <th className="w-20 border-b border-[var(--line)] p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const errors = errorsByRow.get(row.key) ?? [];
              const badColumns = new Set(errors.map((e) => e.column));
              const isDupe = dupes.has(row.key);
              return (
                <tr
                  key={row.key}
                  className={
                    isDupe ? "bg-[var(--warn-soft)]" : selected.has(row.key) ? "bg-[var(--amber-soft)]" : ""
                  }
                >
                  <td className="border-b border-[var(--line)] p-2 align-top">
                    <input
                      type="checkbox"
                      checked={selected.has(row.key)}
                      onChange={(e) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(row.key);
                          else next.delete(row.key);
                          return next;
                        });
                      }}
                    />
                  </td>

                  {GRID_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`relative border-b border-l border-[var(--line)] p-0 align-top ${
                        badColumns.has(col.key) ? "bg-[var(--warn-soft)]" : ""
                      }`}
                    >
                      <Cell
                        row={row}
                        column={col.key}
                        kind={col.kind}
                        stores={stores}
                        storeById={storeById}
                        pickerOpen={picker === `${row.key}:${col.key}`}
                        onFocus={() => setActive({ key: row.key, column: col.key })}
                        onOpenPicker={() =>
                          setPicker((p) => (p === `${row.key}:${col.key}` ? null : `${row.key}:${col.key}`))
                        }
                        onClosePicker={() => setPicker(null)}
                        onChange={(changes) => patch(row.key, changes)}
                      />
                    </td>
                  ))}

                  <td className="border-b border-[var(--line)] p-1 align-top">
                    <div className="flex gap-1">
                      <IconButton title="نسخ الصف" onClick={() => duplicateRow(row.key)}>
                        ⧉
                      </IconButton>
                      <IconButton
                        title="حذف الصف"
                        onClick={() => removeRows(new Set([row.key]))}
                      >
                        ✕
                      </IconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold"
        >
          + صف جديد
        </button>
        <p className="text-xs text-[var(--mute)]">
          تقدر تنسخ نطاق من إكسل وتلصقه مباشرة على أي خلية.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ sub-components */

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "bad" }) {
  const styles = {
    ok: "bg-[var(--ok-soft)] text-[var(--ok)]",
    warn: "bg-[var(--amber-soft)] text-[var(--amber)]",
    bad: "bg-[var(--warn-soft)] text-[var(--warn)]",
  }[tone];
  return (
    <span className={`rounded-lg px-2.5 py-1 font-bold ${styles}`}>
      {label} {value}
    </span>
  );
}

function IconButton({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="h-7 w-7 rounded-md border border-[var(--line)] text-[var(--mute)] hover:bg-[var(--paper)]"
    >
      {children}
    </button>
  );
}

function BulkBar({
  count,
  onFill,
  onDelete,
  onClear,
}: {
  count: number;
  onFill: (column: GridColumnKey, value: string) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--amber)] bg-[var(--amber-soft)] p-2 text-sm">
      <b>{count} صف محدد</b>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onFill("brand", e.target.value);
          e.target.value = "";
        }}
        className="rounded-lg border border-[var(--line)] bg-white px-2 py-1"
      >
        <option value="">عبّي البراند…</option>
        {BRANDS.map((b) => (
          <option key={b.name} value={b.name}>
            {b.name}
          </option>
        ))}
      </select>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onFill("display_type", e.target.value);
          e.target.value = "";
        }}
        className="rounded-lg border border-[var(--line)] bg-white px-2 py-1"
      >
        <option value="">عبّي نوع الاستاند…</option>
        {DISPLAY_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        type="date"
        onChange={(e) => e.target.value && onFill("effective_from", e.target.value)}
        className="rounded-lg border border-[var(--line)] bg-white px-2 py-1"
        title="عبّي تاريخ البداية"
      />
      <input
        type="date"
        onChange={(e) => e.target.value && onFill("effective_to", e.target.value)}
        className="rounded-lg border border-[var(--line)] bg-white px-2 py-1"
        title="عبّي تاريخ النهاية"
      />
      <button type="button" onClick={onDelete} className="rounded-lg bg-[var(--warn)] px-3 py-1 font-bold text-white">
        حذف
      </button>
      <button type="button" onClick={onClear} className="mr-auto text-[var(--mute)] underline">
        إلغاء التحديد
      </button>
    </div>
  );
}

function Cell({
  row,
  column,
  kind,
  stores,
  storeById,
  pickerOpen,
  onFocus,
  onOpenPicker,
  onClosePicker,
  onChange,
}: {
  row: ActivityDraft;
  column: GridColumnKey;
  kind: string;
  stores: StoreOption[];
  storeById: Map<string, StoreOption>;
  pickerOpen: boolean;
  onFocus: () => void;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  onChange: (changes: Partial<ActivityDraft>) => void;
}) {
  const base =
    "w-full bg-transparent px-2 py-1.5 outline-none focus:bg-[var(--amber-soft)]";

  if (kind === "store") {
    const store = row.planned_store_id ? storeById.get(row.planned_store_id) : undefined;
    return (
      <>
        <button
          type="button"
          onFocus={onFocus}
          onClick={onOpenPicker}
          className={`${base} text-right`}
        >
          {store ? (
            <span className="font-bold">{store.name}</span>
          ) : row.mars_store_name ? (
            <span className="text-[var(--warn)]">{row.mars_store_name} — اربطه</span>
          ) : (
            <span className="text-[var(--mute)]">اختر السوق</span>
          )}
        </button>
        {pickerOpen && (
          <StorePicker
            value={row.planned_store_id}
            stores={stores}
            label="ابحث باسم السوق"
            onClose={onClosePicker}
            onPick={(store) => {
              onChange({
                planned_store_id: store.id,
                mars_store_name: row.mars_store_name || store.name,
                account: store.account,
                match_method: "manual",
                match_score: 1,
              });
              onClosePicker();
            }}
          />
        )}
      </>
    );
  }

  if (kind === "select") {
    const options = column === "brand" ? BRANDS.map((b) => b.name) : [...DISPLAY_TYPES];
    return (
      <select
        value={String(row[column] ?? "")}
        onFocus={onFocus}
        onChange={(e) => onChange({ [column]: e.target.value } as Partial<ActivityDraft>)}
        className={base}
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={kind === "date" ? "date" : "text"}
      value={String(row[column] ?? "")}
      onFocus={onFocus}
      onChange={(e) => onChange({ [column]: e.target.value } as Partial<ActivityDraft>)}
      className={base}
    />
  );
}
