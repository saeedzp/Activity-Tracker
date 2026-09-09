/**
 * Convert the store master workbook (JP_FOR_CLO.xlsx) into seed/stores.csv.
 *
 *   npx tsx scripts/xlsx-to-csv.ts <input.xlsx> [output.csv]
 *
 * The workbook carries employee names and numbers, so both it and the CSV it
 * produces stay out of git. Only this converter is committed.
 *
 * The source has repeated STORE ID rows. Identical repeats are collapsed
 * silently; repeats that disagree on a field are reported so a human decides.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const COLUMNS = [
  "STORE ID", "MARS Code", "MARS Store", "Region", "City", "Account Name",
  "Account Code", "Store Name", "Retailer NO.", "Zone", "ME (1) ID",
  "ME (1) Name", "TL ID", "TL Name", "Lat", "Long",
] as const;

/** Values Excel writes for a failed lookup; they are not real data. */
const EXCEL_ERRORS = new Set(["#N/A", "#REF!", "#VALUE!", "#NAME?", "#DIV/0!", "#NULL!"]);

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

function colToIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Read the first worksheet as a grid of trimmed strings. */
export function readSheet(buffer: Uint8Array): string[][] {
  const files = unzipSync(buffer);
  const sharedXml = files["xl/sharedStrings.xml"];
  const shared: string[] = [];
  if (sharedXml) {
    const xml = strFromU8(sharedXml);
    for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) ?? []) {
      const text = (si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) ?? [])
        .map((t) => decodeXml(t.replace(/<[^>]+>/g, "")))
        .join("");
      shared.push(text);
    }
  }

  const sheetName =
    Object.keys(files).find((f) => /^xl\/worksheets\/sheet1\.xml$/.test(f)) ??
    Object.keys(files).find((f) => /^xl\/worksheets\/.*\.xml$/.test(f));
  if (!sheetName) throw new Error("no worksheet found in workbook");

  const grid: string[][] = [];
  for (const rowXml of strFromU8(files[sheetName]).match(/<row[\s\S]*?<\/row>/g) ?? []) {
    const cells: string[] = [];
    // Two separate alternatives, self-closing first: a single pattern with an
    // optional `/` lets a greedy `[^>]*` swallow an empty cell together with the
    // next one, which silently shifts every later column in the row.
    const cellPattern = /<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g;
    for (const cellXml of rowXml.match(cellPattern) ?? []) {
      const ref = cellXml.match(/r="([A-Z]+\d+)"/)?.[1];
      const type = cellXml.match(/t="([^"]+)"/)?.[1];
      const raw = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const inline = cellXml.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/)?.[1];

      let value = "";
      if (type === "s" && raw !== undefined) value = shared[Number(raw)] ?? "";
      else if (type === "inlineStr" && inline !== undefined) value = decodeXml(inline);
      else if (raw !== undefined) value = decodeXml(raw);

      const idx = ref ? colToIndex(ref) : cells.length;
      while (cells.length < idx) cells.push("");
      cells[idx] = value.trim();
    }
    grid.push(cells);
  }
  return grid;
}

function csvEscape(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export interface ConvertReport {
  rows: number;
  unique: number;
  identicalDuplicates: number;
  conflicts: { id: string; column: string; values: string[] }[];
  excelErrors: { id: string; column: string }[];
}

export function convert(grid: string[][]): { csv: string; report: ConvertReport } {
  const header = (grid[0] ?? []).map((h) => h.trim());
  const missing = COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`workbook is missing columns: ${missing.join(", ")}`);

  const records = grid
    .slice(1)
    .filter((r) => r.some((c) => c !== ""))
    .map((cells) => {
      const rec: Record<string, string> = {};
      header.forEach((key, i) => {
        rec[key] = (cells[i] ?? "").trim();
      });
      return rec;
    });

  const byId = new Map<string, Record<string, string>>();
  const conflicts: ConvertReport["conflicts"] = [];
  const excelErrors: ConvertReport["excelErrors"] = [];
  let identicalDuplicates = 0;

  for (const rec of records) {
    for (const col of COLUMNS) {
      if (EXCEL_ERRORS.has(rec[col])) {
        excelErrors.push({ id: rec["STORE ID"], column: col });
        rec[col] = "";
      }
    }
    const id = rec["STORE ID"];
    if (!id) continue;

    const seen = byId.get(id);
    if (!seen) {
      byId.set(id, rec);
      continue;
    }
    const differing = COLUMNS.filter((c) => seen[c] !== rec[c]);
    if (differing.length === 0) {
      identicalDuplicates++;
      continue;
    }
    // Keep the first row and surface the disagreement rather than guessing.
    for (const col of differing) {
      conflicts.push({ id, column: col, values: [seen[col], rec[col]] });
    }
  }

  const lines = [COLUMNS.join(",")];
  for (const rec of byId.values()) {
    lines.push(COLUMNS.map((c) => csvEscape(rec[c] ?? "")).join(","));
  }

  return {
    csv: lines.join("\n") + "\n",
    report: {
      rows: records.length,
      unique: byId.size,
      identicalDuplicates,
      conflicts,
      excelErrors,
    },
  };
}

function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("usage: npx tsx scripts/xlsx-to-csv.ts <input.xlsx> [output.csv]");
    process.exit(1);
  }
  const output = process.argv[3] ?? path.join(process.cwd(), "seed", "stores.csv");
  const { csv, report } = convert(readSheet(readFileSync(input)));

  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, csv, "utf8");

  console.log(`Read ${report.rows} rows -> ${report.unique} unique stores.`);
  console.log(`Collapsed ${report.identicalDuplicates} identical duplicate rows.`);
  if (report.excelErrors.length) {
    console.log(`\nBlanked ${report.excelErrors.length} Excel error cell(s):`);
    for (const e of report.excelErrors) console.log(`  ${e.id}  ${e.column}`);
  }
  if (report.conflicts.length) {
    console.log(`\n${report.conflicts.length} conflicting duplicate field(s) — kept the first, please confirm:`);
    for (const c of report.conflicts) {
      console.log(`  ${c.id}  ${c.column}: "${c.values[0]}" vs "${c.values[1]}"`);
    }
  }
  console.log(`\nWrote ${output}`);
}

if (process.argv[1]?.endsWith("xlsx-to-csv.ts")) main();
