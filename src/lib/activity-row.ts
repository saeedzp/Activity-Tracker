/**
 * Shape of an `activities` row as it comes back from Supabase, and the
 * translation into the draft the grid edits.
 *
 * supabase-js cannot infer column types without generated database typings, so
 * this is the single place the shape is declared instead of casting at every
 * call site.
 */

import type { ActivityDraft } from "./grid";
import type { MatchMethod } from "./domain";

export const ACTIVITY_GRID_SELECT =
  "id, month, brand, display_type, promo_desc, effective_from, effective_to," +
  " planned_store_id, account, mars_store_no, mars_store_name, match_method, match_score";

export interface ActivityRow {
  id: string;
  month: string | null;
  brand: string | null;
  display_type: string | null;
  promo_desc: string | null;
  effective_from: string | null;
  effective_to: string | null;
  planned_store_id: string | null;
  account: string | null;
  mars_store_no: string | null;
  mars_store_name: string | null;
  match_method: string | null;
  match_score: number | null;
}

const MATCH_METHODS = new Set(["exact", "fuzzy", "manual", "unlinked"]);

export function toDraft(row: ActivityRow, fallbackMonth: string): ActivityDraft {
  const method = row.match_method ?? "";
  return {
    key: row.id,
    id: row.id,
    month: row.month ?? fallbackMonth,
    brand: row.brand ?? "",
    display_type: row.display_type ?? "",
    promo_desc: row.promo_desc ?? "",
    effective_from: row.effective_from ?? "",
    effective_to: row.effective_to ?? "",
    mars_store_no: row.mars_store_no ?? "",
    mars_store_name: row.mars_store_name ?? "",
    account: row.account ?? "",
    planned_store_id: row.planned_store_id,
    match_method: (MATCH_METHODS.has(method) ? method : "unlinked") as MatchMethod,
    match_score: row.match_score,
  };
}
