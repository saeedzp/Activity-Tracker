/**
 * Shared pieces of the route upload, so the preview and the apply step read
 * the same rows the same way and cannot drift.
 */

import { parseCsvRecords } from "./csv";
import { readSheet } from "./xlsx";
import { dedupe, toStore, type StoreRecordRow } from "./route-import";

export const STORE_COLUMNS =
  "id, name, account, city, region, mars_code, retailer_no, me_id, me_name, tl_id, tl_name, active";

/** Read an uploaded .xlsx or .csv into store rows. */
export function parseRouteFile(name: string, bytes: Uint8Array): StoreRecordRow[] {
  const records = name.toLowerCase().endsWith(".csv")
    ? parseCsvRecords(new TextDecoder().decode(bytes))
    : gridToRecords(readSheet(bytes));

  return dedupe(records.map(toStore).filter((s): s is StoreRecordRow => s !== null));
}

function gridToRecords(grid: string[][]): Record<string, string>[] {
  const header = (grid[0] ?? []).map((h) => h.trim());
  return grid
    .slice(1)
    .filter((row) => row.some((cell) => cell !== ""))
    .map((cells) => {
      const record: Record<string, string> = {};
      header.forEach((key, index) => {
        record[key] = (cells[index] ?? "").trim();
      });
      return record;
    });
}
