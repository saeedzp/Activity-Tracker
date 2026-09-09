/**
 * Spreadsheet behaviour for the activity control grid.
 *
 * Everything here is pure: parsing a clipboard payload, validating a row and
 * working out what actually changed. The React layer and the API routes both
 * build on it, and it is fully testable without a database.
 */

import {
  DISPLAY_TYPES,
  BRANDS,
  type DisplayType,
  type MatchMethod,
} from "./domain";

export interface ActivityDraft {
  /** Client-side row key. Server ids are uuids; new rows carry a `new:` key. */
  key: string;
  id?: string;
  period: string;
  brand: string;
  display_type: string;
  promo_desc: string;
  effective_from: string;
  effective_to: string;
  /** Store as typed/pasted from the Mars file, before matching. */
  mars_store_no: string;
  mars_store_name: string;
  account: string;
  /** Resolved store, once matched or picked by hand. */
  planned_store_id: string | null;
  match_method: MatchMethod;
  match_score: number | null;
}

export const GRID_COLUMNS = [
  { key: "mars_store_name", label: "السوق", width: 220, kind: "store" },
  { key: "account", label: "الأكاونت", width: 120, kind: "text" },
  { key: "brand", label: "البراند", width: 130, kind: "select" },
  { key: "display_type", label: "نوع الاستاند", width: 130, kind: "select" },
  { key: "promo_desc", label: "وصف البروموشن", width: 220, kind: "text" },
  { key: "effective_from", label: "من تاريخ", width: 130, kind: "date" },
  { key: "effective_to", label: "إلى تاريخ", width: 130, kind: "date" },
  { key: "mars_store_no", label: "رقم السوق", width: 120, kind: "text" },
] as const;

export type GridColumnKey = (typeof GRID_COLUMNS)[number]["key"];

export const EDITABLE_KEYS = GRID_COLUMNS.map((c) => c.key);

export function emptyDraft(period: string, key: string): ActivityDraft {
  return {
    key,
    period,
    brand: "",
    display_type: "",
    promo_desc: "",
    effective_from: "",
    effective_to: "",
    mars_store_no: "",
    mars_store_name: "",
    account: "",
    planned_store_id: null,
    match_method: "unlinked",
    match_score: null,
  };
}

/* ------------------------------------------------------------------- paste */

/**
 * Split a clipboard payload into a grid.
 *
 * Excel and Google Sheets both put tab-separated text on the clipboard, and
 * quote any cell containing a tab or newline. Quotes are honoured so a promo
 * description spanning two lines stays in one cell.
 */
export function parseClipboard(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && cell === "") quoted = true;
    else if (ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  rows.push(row);

  // A trailing newline leaves one empty row behind; drop only that.
  while (rows.length > 1 && rows[rows.length - 1].every((c) => c === "")) rows.pop();
  return rows;
}

/* -------------------------------------------------------------- coercion */

const BRAND_NAMES: readonly string[] = BRANDS.map((b) => b.name);

/** Match a pasted value against a fixed list, case- and space-insensitively. */
function coerceToList(value: string, options: readonly string[]): string | null {
  const v = value.trim().toLowerCase().replace(/\s+/g, "");
  return options.find((o) => o.toLowerCase().replace(/\s+/g, "") === v) ?? null;
}

export function coerceBrand(value: string): string | null {
  return coerceToList(value, BRAND_NAMES);
}

export function coerceDisplayType(value: string): DisplayType | null {
  return coerceToList(value, DISPLAY_TYPES) as DisplayType | null;
}

/**
 * Normalize a pasted date to ISO. Excel commonly yields d/m/Y or m/d/Y; an
 * ambiguous pair is read as day-first, which is what the Mars files use.
 */
export function coerceDate(value: string): string | null {
  const v = value.trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  const parts = v.split(/[/.\-]/).map((p) => p.trim());
  if (parts.length === 3) {
    let [a, b, c] = parts;
    if (a.length === 4) [a, b, c] = [c, b, a]; // Y/M/D -> D/M/Y
    const day = Number(a);
    const month = Number(b);
    const year = Number(c.length === 2 ? `20${c}` : c);
    if (
      Number.isInteger(day) && Number.isInteger(month) && Number.isInteger(year) &&
      day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100
    ) {
      const iso = new Date(Date.UTC(year, month - 1, day));
      // Rejects 31/02 and friends, which Date would otherwise roll forward.
      if (iso.getUTCMonth() === month - 1 && iso.getUTCDate() === day) {
        return iso.toISOString().slice(0, 10);
      }
    }
  }
  return null;
}

/** Apply a pasted string to one cell, coercing it to the column's shape. */
export function coerceCell(column: GridColumnKey, value: string): string | null {
  switch (column) {
    case "brand":
      return coerceBrand(value);
    case "display_type":
      return coerceDisplayType(value);
    case "effective_from":
    case "effective_to":
      return coerceDate(value);
    default:
      return value.trim();
  }
}

/* ------------------------------------------------------------- validation */

export interface RowError {
  column: GridColumnKey | "planned_store_id";
  message: string;
}

export function validateRow(row: ActivityDraft): RowError[] {
  const errors: RowError[] = [];

  if (!row.mars_store_name.trim() && !row.mars_store_no.trim()) {
    errors.push({ column: "mars_store_name", message: "اكتب اسم السوق أو رقمه" });
  }
  if (!row.brand.trim()) {
    errors.push({ column: "brand", message: "اختر البراند" });
  } else if (!BRAND_NAMES.includes(row.brand)) {
    errors.push({ column: "brand", message: "براند غير معروف" });
  }
  if (!row.display_type.trim()) {
    errors.push({ column: "display_type", message: "اختر نوع الاستاند" });
  } else if (!(DISPLAY_TYPES as readonly string[]).includes(row.display_type)) {
    errors.push({ column: "display_type", message: "نوع استاند غير معروف" });
  }
  if (!row.planned_store_id) {
    errors.push({ column: "planned_store_id", message: "السوق غير مربوط" });
  }
  if (
    row.effective_from && row.effective_to &&
    row.effective_from > row.effective_to
  ) {
    errors.push({ column: "effective_to", message: "تاريخ النهاية قبل البداية" });
  }
  return errors;
}

/** A row is ready to save once nothing is wrong with it. */
export function isRowValid(row: ActivityDraft): boolean {
  return validateRow(row).length === 0;
}

/**
 * A row the operator started but left blank carries no information, so it is
 * neither saved nor reported as invalid.
 */
export function isRowEmpty(row: ActivityDraft): boolean {
  return EDITABLE_KEYS.every((k) => String(row[k] ?? "").trim() === "");
}

/* ---------------------------------------------------------------- diffing */

/** Rows whose content differs from the last saved copy, keyed by row key. */
export function changedRows(
  current: ActivityDraft[],
  saved: Map<string, ActivityDraft>,
): ActivityDraft[] {
  return current.filter((row) => {
    if (isRowEmpty(row)) return false;
    const before = saved.get(row.key);
    if (!before) return true;
    if (before.planned_store_id !== row.planned_store_id) return true;
    return EDITABLE_KEYS.some((k) => before[k] !== row[k]);
  });
}

/** Duplicate lines: the same store, brand and display type inside one period. */
export function duplicateKeys(rows: ActivityDraft[]): Set<string> {
  const seen = new Map<string, string>();
  const dupes = new Set<string>();
  for (const row of rows) {
    if (!row.planned_store_id || !row.brand || !row.display_type) continue;
    const id = `${row.period}|${row.planned_store_id}|${row.brand}|${row.display_type}`;
    const first = seen.get(id);
    if (first) {
      dupes.add(first);
      dupes.add(row.key);
    } else seen.set(id, row.key);
  }
  return dupes;
}
