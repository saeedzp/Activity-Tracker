import { describe, expect, it } from "vitest";
import {
  MARS_COLUMNS,
  marsCsv,
  marsRows,
  type ExportStore,
  type ExportSubmission,
} from "../src/lib/mars-export";

const store = (over: Partial<ExportStore> = {}): ExportStore => ({
  id: "AM260",
  name: "Panda Al Rawabi",
  account: "panda",
  city: "Jeddah",
  region: "west",
  mars_code: "100001",
  retailer_no: "0",
  customer_number: null,
  ...over,
});

const sub = (over: Partial<ExportSubmission> = {}): ExportSubmission => ({
  id: "s1",
  month: "2026-09",
  store_id: "AM260",
  activity_name: "Back to School",
  brands: ["Twix"],
  brand_categories: { Twix: "Chocolate", Snickers: "Chocolate" },
  effective_from: null,
  effective_to: null,
  display_type: "2x2",
  entry_date: "2026-09-09",
  implementation_date: "2026-09-10",
  status: "Implemented",
  reason_code: null,
  alt_store_name: null,
  submitted_at: "2026-09-10T09:00:00Z",
  ...over,
});

const cell = (row: string[], name: (typeof MARS_COLUMNS)[number]) =>
  row[MARS_COLUMNS.indexOf(name)];

describe("MARS_COLUMNS", () => {
  it("keeps Mars' own spelling, misspellings included", () => {
    // Correcting these would give them a column they cannot find.
    expect(MARS_COLUMNS).toContain("Additonal Comments");
    expect(MARS_COLUMNS).toContain("Compliance Implemantation");
  });

  it("carries the twenty Mars columns plus Customer Number", () => {
    expect(MARS_COLUMNS).toHaveLength(21);
    expect(MARS_COLUMNS).toContain("Customer Number");
  });

  it("starts in Mars' order", () => {
    expect(MARS_COLUMNS.slice(0, 4)).toEqual([
      "Category",
      "Brand",
      "Display Type/Size",
      "Promotion Description",
    ]);
  });
});

describe("marsRows", () => {
  it("maps a submission onto Mars' columns", () => {
    const [row] = marsRows([sub()], [store()]);
    expect(cell(row, "Category")).toBe("Chocolate");
    expect(cell(row, "Brand")).toBe("Twix");
    expect(cell(row, "Display Type/Size")).toBe("2x2");
    expect(cell(row, "Promotion Description")).toBe("Back to School");
    expect(cell(row, "Store Name")).toBe("Panda Al Rawabi");
    expect(cell(row, "Tarweej Feedback")).toBe("Implemented");
    // The day the stand went in, not the day it was reported.
    expect(cell(row, "Implementation Date")).toBe("2026-09-09");
    expect(cell(row, "Date of Check (First)")).toBe("2026-09-10");
  });

  it("writes one line per brand, because their file is one line per brand", () => {
    const rows = marsRows([sub({ brands: ["Twix", "Snickers"] })], [store()]);
    expect(rows.map((r) => cell(r, "Brand"))).toEqual(["Twix", "Snickers"]);
    // Everything else repeats, so each line stands on its own.
    expect(rows.every((r) => cell(r, "Store Name") === "Panda Al Rawabi")).toBe(true);
  });

  it("keeps a submission with no brands rather than dropping it", () => {
    const rows = marsRows([sub({ brands: [] })], [store()]);
    expect(rows).toHaveLength(1);
    expect(cell(rows[0], "Brand")).toBe("");
  });

  it("prefers the Mars code over the unreliable retailer number", () => {
    const [row] = marsRows([sub()], [store({ mars_code: "100001", retailer_no: "55" })]);
    expect(cell(row, "Store #")).toBe("100001");
    const [fallback] = marsRows([sub()], [store({ mars_code: null, retailer_no: "55" })]);
    expect(cell(fallback, "Store #")).toBe("55");
  });

  it("names the real store in Additonal Comments when it went in elsewhere", () => {
    const [row] = marsRows(
      [
        sub({
          status: "Implemented in another store",
          alt_store_name: "Othaim Olaya",
        }),
      ],
      [store()],
    );
    expect(cell(row, "Additonal Comments")).toBe("Othaim Olaya");
  });

  it("leaves Additonal Comments empty for every other status", () => {
    const [row] = marsRows([sub({ alt_store_name: "ignored" })], [store()]);
    expect(cell(row, "Additonal Comments")).toBe("");
  });

  it("says Yes on Pic only when a photo was actually stored", () => {
    const [withPic] = marsRows([sub()], [store()], { withPhotos: new Set(["s1"]) });
    expect(cell(withPic, "Pic Yes/No")).toBe("Yes");
    const [without] = marsRows([sub()], [store()]);
    expect(cell(without, "Pic Yes/No")).toBe("");
  });

  it("carries the customer number once the route file has one", () => {
    const [row] = marsRows([sub()], [store({ customer_number: "C-7788" })]);
    expect(cell(row, "Customer Number")).toBe("C-7788");
  });

  it("still exports a submission whose store is missing", () => {
    // The store id is a worse answer than its name, and far better than a gap.
    const [row] = marsRows([sub({ store_id: "GONE" })], []);
    expect(cell(row, "Store Name")).toBe("GONE");
  });

  it("gives every row the full column count", () => {
    const rows = marsRows([sub(), sub({ brands: ["A", "B"] })], [store()]);
    expect(rows.every((r) => r.length === MARS_COLUMNS.length)).toBe(true);
  });
});

describe("the columns that used to export empty", () => {
  it("categorises per brand, so one campaign can mix categories", () => {
    const rows = marsRows(
      [
        sub({
          brands: ["Twix", "Extra"],
          brand_categories: { Twix: "Chocolate", Extra: "Gum" },
        }),
      ],
      [store()],
    );
    expect(rows.map((r) => cell(r, "Category"))).toEqual(["Chocolate", "Gum"]);
  });

  it("leaves the category empty for a brand nobody categorised", () => {
    const [row] = marsRows([sub({ brand_categories: {} })], [store()]);
    expect(cell(row, "Category")).toBe("");
  });

  it("carries the campaign dates when Mars sent them", () => {
    const [row] = marsRows(
      [sub({ effective_from: "2026-09-01", effective_to: "2026-09-30" })],
      [store()],
    );
    expect(cell(row, "Effective From")).toBe("2026-09-01");
    expect(cell(row, "Effective To")).toBe("2026-09-30");
  });

  it("leaves them empty when Mars sent none", () => {
    const [row] = marsRows([sub()], [store()]);
    expect(cell(row, "Effective From")).toBe("");
    expect(cell(row, "Effective To")).toBe("");
  });

  it("dates the check by when the report was filed", () => {
    const [row] = marsRows([sub({ submitted_at: "2026-10-03T21:00:00Z" })], [store()]);
    expect(cell(row, "Date of Check (First)")).toBe("2026-10-03");
  });

  it("falls back to the implementation date when no entry date was given", () => {
    const [row] = marsRows(
      [sub({ entry_date: null, implementation_date: "2026-09-12" })],
      [store()],
    );
    expect(cell(row, "Implementation Date")).toBe("2026-09-12");
  });
});

describe("marsCsv", () => {
  it("leads with the BOM so Excel reads it as UTF-8", () => {
    expect(marsCsv([]).startsWith("﻿")).toBe(true);
  });

  it("quotes a value containing a comma", () => {
    const csv = marsCsv(marsRows([sub({ activity_name: "Back, to School" })], [store()]));
    expect(csv).toContain('"Back, to School"');
  });

  it("writes the header exactly once, in order", () => {
    const csv = marsCsv(marsRows([sub()], [store()]));
    expect(csv.split("\n")[0]).toBe("﻿" + MARS_COLUMNS.join(","));
  });
});
