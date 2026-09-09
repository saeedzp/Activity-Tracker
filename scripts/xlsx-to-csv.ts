/**
 * CLI wrapper: converts the store master workbook into seed/stores.csv.
 *
 *   npx tsx scripts/xlsx-to-csv.ts <input.xlsx> [output.csv]
 *
 * The workbook carries employee names and numbers, so both it and the CSV it
 * produces stay out of git. The parsing itself lives in src/lib/xlsx.ts, which
 * the app's route-upload screen uses too.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { convert, readSheet, COLUMNS } from "../src/lib/xlsx";

export { convert, readSheet, COLUMNS };

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
