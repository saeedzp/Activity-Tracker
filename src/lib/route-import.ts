/**
 * Comparing an uploaded route file against the stores already on record.
 *
 * A route file arrives every month and mostly repeats what is already there.
 * Applying it blind would be a coin toss over which rows changed, so the upload
 * is split in two: work out the difference here, show it, and only then write.
 *
 * Pure on purpose — no database, no request — so the rules can be tested.
 */

import { normalizeAccount, normalizeRegion } from "./match";

/** A store as the app stores it. */
export interface StoreRecordRow {
  id: string;
  name: string;
  account: string;
  city: string | null;
  region: string | null;
  mars_code: string | null;
  retailer_no: string | null;
  me_id: string | null;
  me_name: string | null;
  tl_id: string | null;
  tl_name: string | null;
  active?: boolean;
}

export interface UserRow {
  emp_id: string;
  name: string;
  role: "me" | "tl";
}

/** Fields whose change is worth showing; the rest are noise from the source. */
export const TRACKED_FIELDS = [
  "name",
  "account",
  "city",
  "region",
  "mars_code",
  "retailer_no",
  "me_id",
  "me_name",
  "tl_id",
  "tl_name",
] as const;

export type TrackedField = (typeof TRACKED_FIELDS)[number];

export interface FieldChange {
  field: TrackedField;
  before: string | null;
  after: string | null;
}

export interface RouteDiff {
  added: StoreRecordRow[];
  changed: { store: StoreRecordRow; changes: FieldChange[] }[];
  unchanged: number;
  /** Present before, absent from this file — deactivated, never deleted. */
  missing: StoreRecordRow[];
  /** Employees the file introduces. */
  newUsers: UserRow[];
}

function pick(rec: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = rec[key];
    if (value !== undefined && value.trim() !== "") return value.trim();
  }
  return "";
}

/** Keep a store number only when it is a non-zero integer. */
function usableNumber(value: string): string | null {
  const raw = value.trim();
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw) === 0 ? null : String(Number(raw));
}

/** Turn one parsed spreadsheet row into a store, or null when it has no id. */
export function toStore(rec: Record<string, string>): StoreRecordRow | null {
  const id = pick(rec, "STORE ID", "Store ID", "store_id");
  if (!id) return null;
  return {
    id,
    name: pick(rec, "Store Name", "MARS Store") || id,
    account: normalizeAccount(pick(rec, "Account Name", "Account Code")),
    city: pick(rec, "City") || null,
    region: normalizeRegion(pick(rec, "Region")) || null,
    mars_code: usableNumber(pick(rec, "MARS Code")),
    retailer_no: usableNumber(pick(rec, "Retailer NO.", "Retailer No")),
    me_id: pick(rec, "ME (1) ID", "ME ID") || null,
    me_name: pick(rec, "ME (1) Name", "ME Name") || null,
    tl_id: pick(rec, "TL ID") || null,
    tl_name: pick(rec, "TL Name") || null,
  };
}

/** Employees named by the file, deduplicated, leaders taking precedence. */
export function usersFrom(stores: StoreRecordRow[]): UserRow[] {
  const users = new Map<string, UserRow>();
  for (const store of stores) {
    if (store.me_id && !users.has(store.me_id)) {
      users.set(store.me_id, {
        emp_id: store.me_id,
        name: store.me_name || store.me_id,
        role: "me",
      });
    }
    if (store.tl_id) {
      // A leader listed as someone's ME elsewhere is still a leader.
      users.set(store.tl_id, {
        emp_id: store.tl_id,
        name: store.tl_name || store.tl_id,
        role: "tl",
      });
    }
  }
  return [...users.values()];
}

/**
 * Collapse repeated STORE ID rows, keeping the first.
 *
 * The source has always carried duplicates; the earlier converter reported
 * them, and here the first row simply wins so the upload never stalls.
 */
export function dedupe(stores: StoreRecordRow[]): StoreRecordRow[] {
  const byId = new Map<string, StoreRecordRow>();
  for (const store of stores) if (!byId.has(store.id)) byId.set(store.id, store);
  return [...byId.values()];
}

function differences(before: StoreRecordRow, after: StoreRecordRow): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const field of TRACKED_FIELDS) {
    const a = before[field] ?? null;
    const b = after[field] ?? null;
    if ((a ?? "") !== (b ?? "")) changes.push({ field, before: a, after: b });
  }
  return changes;
}

export function diffRoute(
  incoming: StoreRecordRow[],
  existing: StoreRecordRow[],
  knownEmpIds: string[] = [],
): RouteDiff {
  const rows = dedupe(incoming);
  const current = new Map(existing.map((s) => [s.id, s]));
  const seen = new Set<string>();

  const added: StoreRecordRow[] = [];
  const changed: RouteDiff["changed"] = [];
  let unchanged = 0;

  for (const store of rows) {
    seen.add(store.id);
    const before = current.get(store.id);
    if (!before) {
      added.push(store);
      continue;
    }
    const changes = differences(before, store);
    // A store that was switched off and appears again counts as a change.
    if (changes.length === 0 && before.active !== false) unchanged++;
    else changed.push({ store, changes });
  }

  const known = new Set(knownEmpIds);
  return {
    added,
    changed,
    unchanged,
    missing: existing.filter((s) => !seen.has(s.id) && s.active !== false),
    newUsers: usersFrom(rows).filter((u) => !known.has(u.emp_id)),
  };
}

export function isNoOp(diff: RouteDiff): boolean {
  return (
    diff.added.length === 0 &&
    diff.changed.length === 0 &&
    diff.missing.length === 0 &&
    diff.newUsers.length === 0
  );
}

export const FIELD_AR: Record<TrackedField, string> = {
  name: "اسم السوق",
  account: "الأكاونت",
  city: "المدينة",
  region: "المنطقة",
  mars_code: "كود مارس",
  retailer_no: "رقم السوق",
  me_id: "رقم الموظف",
  me_name: "اسم الموظف",
  tl_id: "رقم المشرف",
  tl_name: "اسم المشرف",
};
