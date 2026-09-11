/**
 * The export Mars reads.
 *
 * Their own twenty columns in their own order, with their own spelling —
 * "Additonal Comments" and "Compliance Implemantation" are misspelt in the
 * file they send, and a corrected header is a column they cannot find. Plus
 * "Customer Number", which they have agreed to carry: it is the join between
 * our route and their activity files.
 *
 * One row per brand. Their file is one line per brand, size and store, while a
 * campaign here carries several brands at once, so a submission for a campaign
 * of two brands becomes two lines. A submission with no brands still produces
 * one line rather than vanishing.
 */

export const MARS_COLUMNS = [
  "Category",
  "Brand",
  "Display Type/Size",
  "Promotion Description",
  "Effective From",
  "Effective To",
  "Account",
  "Region",
  "City",
  "Store #",
  "Customer Number",
  "Store Name",
  "Date of Check (First)",
  "Tarweej Feedback",
  "Implementation Date",
  "Pic Yes/No",
  "Reason Code",
  "Additonal Comments",
  "Compliance date planned",
  "Compliance Implemantation",
  "Reason For Delay",
] as const;

export interface ExportSubmission {
  id: string;
  month: string | null;
  store_id: string;
  activity_name: string | null;
  brands: string[] | null;
  /** Brand to category, snapshotted from the campaign. */
  brand_categories: Record<string, string> | null;
  effective_from: string | null;
  effective_to: string | null;
  display_type: string | null;
  entry_date: string | null;
  implementation_date: string | null;
  status: string | null;
  reason_code: string | null;
  alt_store_name: string | null;
  submitted_at: string | null;
}

export interface ExportStore {
  id: string;
  name: string | null;
  account: string | null;
  city: string | null;
  region: string | null;
  mars_code: string | null;
  retailer_no: string | null;
  customer_number: string | null;
}

export interface MarsOptions {
  /** Submission ids that have at least one photo. */
  withPhotos?: Set<string>;
}

/** One CSV line per brand, in Mars' column order. */
export function marsRows(
  submissions: ExportSubmission[],
  stores: ExportStore[],
  options: MarsOptions = {},
): string[][] {
  const byId = new Map(stores.map((s) => [s.id, s]));
  const rows: string[][] = [];

  for (const sub of submissions) {
    const store = byId.get(sub.store_id);
    // No brands is still a line: the stand was reported, and dropping it would
    // silently shrink the file.
    const brands = sub.brands?.length ? sub.brands : [""];
    for (const brand of brands) {
      rows.push([
        // Per brand, because one campaign can mix chocolate with gum.
        sub.brand_categories?.[brand] ?? "",
        brand,
        sub.display_type ?? "",
        sub.activity_name ?? "",
        // Optional: Mars does not always send campaign dates.
        sub.effective_from ?? "",
        sub.effective_to ?? "",
        store?.account ?? "",
        store?.region ?? "",
        store?.city ?? "",
        // Mars matches on their own code first; the retailer number is the
        // fallback, and often unusable.
        store?.mars_code ?? store?.retailer_no ?? "",
        store?.customer_number ?? "",
        store?.name ?? sub.store_id,
        // When the employee filed the report — server time, never the phone's.
        sub.submitted_at?.slice(0, 10) ?? "",
        sub.status ?? "",
        // The day the stand went into the store.
        sub.entry_date ?? sub.implementation_date ?? "",
        options.withPhotos?.has(sub.id) ? "Yes" : "",
        sub.reason_code ?? "",
        // The whole point of the status: name the store it actually went into.
        sub.status === "Implemented in another store" ? sub.alt_store_name ?? "" : "",
        "", // Compliance date planned — empty in every row of their own file.
        "", // Compliance Implemantation
        "", // Reason For Delay
      ]);
    }
  }

  return rows;
}

/** The file itself, with the BOM Excel needs to read UTF-8. */
export function marsCsv(rows: string[][]): string {
  const lines = [MARS_COLUMNS.join(",")];
  for (const row of rows) lines.push(row.map(escape).join(","));
  return "﻿" + lines.join("\n");
}

function escape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
