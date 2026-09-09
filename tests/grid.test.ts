import { describe, expect, it } from "vitest";
import {
  changedRows,
  coerceBrand,
  coerceCell,
  coerceDate,
  coerceDisplayType,
  duplicateKeys,
  emptyDraft,
  isRowEmpty,
  isRowValid,
  parseClipboard,
  validateRow,
  type ActivityDraft,
} from "@/lib/grid";

const draft = (over: Partial<ActivityDraft> = {}): ActivityDraft => ({
  ...emptyDraft("2026-09", over.key ?? "r1"),
  brand: "Galaxy",
  display_type: "1x1",
  mars_store_name: "Panda Sari",
  planned_store_id: "W-0001",
  ...over,
});

describe("parseClipboard", () => {
  it("splits an Excel tab-separated block", () => {
    expect(parseClipboard("a\tb\tc\n1\t2\t3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps a quoted cell that contains a newline together", () => {
    const rows = parseClipboard('a\t"line one\nline two"\tc');
    expect(rows).toHaveLength(1);
    expect(rows[0][1]).toBe("line one\nline two");
  });

  it("unescapes a doubled quote", () => {
    expect(parseClipboard('"say ""hi"""')[0][0]).toBe('say "hi"');
  });

  it("drops only the row a trailing newline leaves behind", () => {
    expect(parseClipboard("a\tb\n1\t2\n")).toHaveLength(2);
  });

  it("preserves genuinely empty cells", () => {
    expect(parseClipboard("a\t\tc")).toEqual([["a", "", "c"]]);
  });

  it("handles CRLF from Windows Excel", () => {
    expect(parseClipboard("a\tb\r\n1\t2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("coercion", () => {
  it("matches a brand regardless of case and spacing", () => {
    expect(coerceBrand("galaxy")).toBe("Galaxy");
    expect(coerceBrand("  SNICKERS ")).toBe("Snickers");
    expect(coerceBrand("Galaxi")).toBeNull();
  });

  it("matches a display type regardless of case", () => {
    expect(coerceDisplayType("50x50")).toBe("50X50");
    expect(coerceDisplayType("GMU")).toBe("GMU");
    expect(coerceDisplayType("4x4")).toBeNull();
  });

  it("reads day-first dates, as the Mars files use", () => {
    expect(coerceDate("01/09/2026")).toBe("2026-09-01");
    expect(coerceDate("1.9.2026")).toBe("2026-09-01");
    expect(coerceDate("2026-09-01")).toBe("2026-09-01");
    expect(coerceDate("01/09/26")).toBe("2026-09-01");
  });

  it("keeps an empty date empty and rejects an impossible one", () => {
    expect(coerceDate("")).toBe("");
    expect(coerceDate("31/02/2026")).toBeNull();
    expect(coerceDate("hello")).toBeNull();
  });

  it("routes each column to its own coercion", () => {
    expect(coerceCell("brand", "twix")).toBe("Twix");
    expect(coerceCell("effective_from", "05/10/2026")).toBe("2026-10-05");
    expect(coerceCell("promo_desc", "  free text  ")).toBe("free text");
  });
});

describe("validateRow", () => {
  it("accepts a complete row", () => {
    expect(validateRow(draft())).toEqual([]);
    expect(isRowValid(draft())).toBe(true);
  });

  it("requires a store name or number", () => {
    const errors = validateRow(draft({ mars_store_name: "", mars_store_no: "" }));
    expect(errors.some((e) => e.column === "mars_store_name")).toBe(true);
  });

  it("accepts a store number with no name", () => {
    const errors = validateRow(draft({ mars_store_name: "", mars_store_no: "17663813" }));
    expect(errors.some((e) => e.column === "mars_store_name")).toBe(false);
  });

  it("rejects a brand or display type outside the fixed lists", () => {
    expect(validateRow(draft({ brand: "Pepsi" }))[0].column).toBe("brand");
    expect(validateRow(draft({ display_type: "9x9" }))[0].column).toBe("display_type");
  });

  it("flags a row whose store is not linked yet", () => {
    const errors = validateRow(draft({ planned_store_id: null }));
    expect(errors.some((e) => e.column === "planned_store_id")).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const errors = validateRow(
      draft({ effective_from: "2026-09-10", effective_to: "2026-09-01" }),
    );
    expect(errors.some((e) => e.column === "effective_to")).toBe(true);
  });
});

describe("isRowEmpty", () => {
  it("treats an untouched new row as empty, not invalid", () => {
    const row = emptyDraft("2026-09", "new:1");
    expect(isRowEmpty(row)).toBe(true);
    expect(isRowValid(row)).toBe(false);
  });

  it("stops treating it as empty once anything is typed", () => {
    expect(isRowEmpty({ ...emptyDraft("2026-09", "new:1"), brand: "Mars" })).toBe(false);
  });
});

describe("changedRows", () => {
  it("returns a row that is new to the grid", () => {
    expect(changedRows([draft()], new Map())).toHaveLength(1);
  });

  it("ignores a row that is byte-identical to the saved copy", () => {
    const row = draft();
    expect(changedRows([row], new Map([[row.key, { ...row }]]))).toHaveLength(0);
  });

  it("notices an edited cell and a re-linked store", () => {
    const row = draft();
    const saved = new Map([[row.key, { ...row }]]);
    expect(changedRows([{ ...row, promo_desc: "new" }], saved)).toHaveLength(1);
    expect(changedRows([{ ...row, planned_store_id: "W-0002" }], saved)).toHaveLength(1);
  });

  it("never tries to save a blank row", () => {
    expect(changedRows([emptyDraft("2026-09", "new:1")], new Map())).toHaveLength(0);
  });
});

describe("duplicateKeys", () => {
  it("flags both copies of the same store, brand and display type", () => {
    const a = draft({ key: "a" });
    const b = draft({ key: "b" });
    expect(duplicateKeys([a, b])).toEqual(new Set(["a", "b"]));
  });

  it("allows the same store with a different display type", () => {
    const a = draft({ key: "a" });
    const b = draft({ key: "b", display_type: "2x2" });
    expect(duplicateKeys([a, b]).size).toBe(0);
  });

  it("ignores rows that are not linked yet", () => {
    const a = draft({ key: "a", planned_store_id: null });
    const b = draft({ key: "b", planned_store_id: null });
    expect(duplicateKeys([a, b]).size).toBe(0);
  });
});
