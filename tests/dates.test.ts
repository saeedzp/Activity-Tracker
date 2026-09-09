import { describe, expect, it } from "vitest";
import { formatDateAr, formatMonthAr, MONTHS_AR } from "@/lib/dates";

describe("formatDateAr", () => {
  it("names the month the way it is said in Saudi usage", () => {
    expect(formatDateAr("2026-09-09")).toBe("9 سبتمبر 2026");
    expect(formatDateAr("2026-08-01")).toBe("1 أغسطس 2026");
    expect(formatDateAr("2026-01-31")).toBe("31 يناير 2026");
  });

  it("drops the leading zero from the day", () => {
    expect(formatDateAr("2026-09-05").startsWith("5 ")).toBe(true);
  });

  it("returns a dash for nothing", () => {
    expect(formatDateAr(null)).toBe("—");
    expect(formatDateAr("")).toBe("—");
  });

  it("passes through anything that is not an ISO date", () => {
    expect(formatDateAr("not a date")).toBe("not a date");
    expect(formatDateAr("2026-13-01")).toBe("2026-13-01");
  });
});

describe("formatMonthAr", () => {
  it("names the month", () => {
    expect(formatMonthAr("2026-09")).toBe("سبتمبر 2026");
  });

  it("passes through a malformed month", () => {
    expect(formatMonthAr("2026")).toBe("2026");
  });
});

describe("MONTHS_AR", () => {
  it("covers all twelve months", () => {
    expect(MONTHS_AR).toHaveLength(12);
    expect(new Set(MONTHS_AR).size).toBe(12);
  });
});
