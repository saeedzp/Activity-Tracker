import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { convert, readSheet } from "../scripts/xlsx-to-csv";

const COLUMNS = [
  "STORE ID", "MARS Code", "MARS Store", "Region", "City", "Account Name",
  "Account Code", "Store Name", "Retailer NO.", "Zone", "ME (1) ID",
  "ME (1) Name", "TL ID", "TL Name", "Lat", "Long",
];

/** Build a minimal .xlsx. `null` in a row means the cell is written self-closing. */
function workbook(rows: (string | null)[][]): Uint8Array {
  const shared: string[] = [];
  const idx = (v: string) => {
    const at = shared.indexOf(v);
    return at >= 0 ? at : shared.push(v) - 1;
  };
  const letter = (i: number) => String.fromCharCode(65 + i);

  const body = rows
    .map((cells, r) => {
      const xml = cells
        .map((v, c) =>
          v === null
            ? `<c r="${letter(c)}${r + 1}" s="3"/>`
            : `<c r="${letter(c)}${r + 1}" s="3" t="s"><v>${idx(v)}</v></c>`,
        )
        .join("");
      return `<row r="${r + 1}">${xml}</row>`;
    })
    .join("");

  const sheet = `<?xml version="1.0"?><worksheet><sheetData>${body}</sheetData></worksheet>`;
  const strings = `<?xml version="1.0"?><sst>${shared
    .map((s) => `<si><t>${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</t></si>`)
    .join("")}</sst>`;

  return zipSync({
    "xl/worksheets/sheet1.xml": strToU8(sheet),
    "xl/sharedStrings.xml": strToU8(strings),
  });
}

function row(overrides: Record<string, string | null> = {}): (string | null)[] {
  const base: Record<string, string | null> = {
    "STORE ID": "W-0001", "MARS Code": "90000001", "MARS Store": null,
    Region: "West", City: "Jeddah", "Account Name": "Lulu", "Account Code": "AC01",
    "Store Name": "Lulu Al Baghdadiyah", "Retailer NO.": "0", Zone: "Zone 2",
    "ME (1) ID": "10001", "ME (1) Name": "Employee One", "TL ID": "20001",
    "TL Name": "Leader One", Lat: null, Long: null,
  };
  return COLUMNS.map((c) => (c in overrides ? overrides[c] : base[c]));
}

describe("readSheet", () => {
  it("keeps columns aligned when a cell is empty mid-row", () => {
    // Regression: a greedy cell pattern used to swallow an empty cell together
    // with the next one, shifting every column after it.
    const grid = readSheet(workbook([COLUMNS, row()]));
    expect(grid[1]).toHaveLength(COLUMNS.length);
    expect(grid[1][COLUMNS.indexOf("MARS Store")]).toBe("");
    expect(grid[1][COLUMNS.indexOf("Region")]).toBe("West");
    expect(grid[1][COLUMNS.indexOf("City")]).toBe("Jeddah");
    expect(grid[1][COLUMNS.indexOf("TL Name")]).toBe("Leader One");
  });

  it("survives several empty cells in a row", () => {
    const grid = readSheet(
      workbook([COLUMNS, row({ "MARS Store": null, Zone: null, "Account Code": null })]),
    );
    expect(grid[1][COLUMNS.indexOf("Store Name")]).toBe("Lulu Al Baghdadiyah");
    expect(grid[1][COLUMNS.indexOf("ME (1) ID")]).toBe("10001");
  });
});

describe("convert", () => {
  it("collapses an identical repeat of a store id", () => {
    const { report } = convert(workbook0([COLUMNS, row(), row()]));
    expect(report.rows).toBe(2);
    expect(report.unique).toBe(1);
    expect(report.identicalDuplicates).toBe(1);
    expect(report.conflicts).toHaveLength(0);
  });

  it("reports a repeat that disagrees instead of guessing", () => {
    const { report, csv } = convert(
      workbook0([COLUMNS, row(), row({ "ME (1) ID": "10002" })]),
    );
    expect(report.unique).toBe(1);
    expect(report.conflicts).toEqual([
      { id: "W-0001", column: "ME (1) ID", values: ["10001", "10002"] },
    ]);
    // The first row is the one kept.
    expect(csv).toContain("10001");
  });

  it("blanks an Excel error value", () => {
    const { report, csv } = convert(workbook0([COLUMNS, row({ "MARS Code": "#N/A" })]));
    expect(report.excelErrors).toEqual([{ id: "W-0001", column: "MARS Code" }]);
    expect(csv).not.toContain("#N/A");
  });

  it("rejects a workbook that is missing a column", () => {
    expect(() => convert(workbook0([COLUMNS.slice(0, 5), row().slice(0, 5)]))).toThrow(
      /missing columns/,
    );
  });
});

function workbook0(rows: (string | null)[][]) {
  return readSheet(workbook(rows));
}
