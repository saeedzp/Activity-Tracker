import { describe, expect, it } from "vitest";
import {
  CLOSING_STATUSES,
  DISPLAY_TYPES,
  ENTRY_STATUSES,
  isClosing,
  isEntryStatus,
  isPlanogramReason,
  PLANOGRAM_REASONS,
  reasonAr,
  reasonCodesFor,
  requiresAltStoreName,
  requiresReasonCode,
  STATUSES,
  statusAr,
} from "@/lib/domain";

describe("closing rule", () => {
  it("closes only on the two implemented statuses", () => {
    expect(isClosing("Implemented")).toBe(true);
    expect(isClosing("Implemented in another store")).toBe(true);
    expect(isClosing("Not Implemented")).toBe(false);
    expect(CLOSING_STATUSES).toHaveLength(2);
  });
});

describe("reason codes", () => {
  it("gives Implemented exactly three codes", () => {
    expect(reasonCodesFor("Implemented")).toEqual([
      "Low Stock",
      "POSM not received",
      "Without POSM",
    ]);
  });

  it("still accepts the thirteen old codes on Not Implemented, plus the two new ones", () => {
    // Append-only: rows from the old question must still validate.
    expect(reasonCodesFor("Not Implemented")).toHaveLength(15);
    for (const code of PLANOGRAM_REASONS) {
      expect(reasonCodesFor("Not Implemented")).toContain(code);
    }
  });

  it("gives Implemented in another store none, but demands the store name", () => {
    expect(reasonCodesFor("Implemented in another store")).toHaveLength(0);
    expect(requiresReasonCode("Implemented in another store")).toBe(false);
    expect(requiresAltStoreName("Implemented in another store")).toBe(true);
    expect(requiresAltStoreName("Implemented")).toBe(false);
  });
});

describe("the planogram question", () => {
  it("files new entries as yes or no only", () => {
    expect(ENTRY_STATUSES).toEqual(["Implemented", "Not Implemented"]);
    expect(isEntryStatus("Implemented in another store")).toBe(false);
  });

  it("offers exactly two reasons for a no", () => {
    expect(PLANOGRAM_REASONS).toEqual(["Low Stock", "No Planogram"]);
    expect(isPlanogramReason("OOS")).toBe(false);
    expect(reasonAr("No Planogram")).toBe("ما فيه بلانوغرام بعد");
    expect(reasonAr("Low Stock")).toBe("ستوك ناقص");
  });
});

describe("display types", () => {
  it("holds the nine agreed sizes", () => {
    expect(DISPLAY_TYPES).toEqual([
      "50X50", "1x1", "2x1", "2x2", "3x2", "6x2", "GE", "GMU", "Rebrandable",
    ]);
  });
});

describe("arabic display labels", () => {
  it("translates every status and reason code", () => {
    for (const s of STATUSES) {
      expect(statusAr(s)).not.toBe(s);
      for (const code of reasonCodesFor(s)) expect(reasonAr(code)).not.toBe(code);
    }
  });

  it("falls back to a dash for a missing code", () => {
    expect(reasonAr(null)).toBe("—");
  });
});
