import { describe, expect, it } from "vitest";
import { asksCustomPosm, CUSTOM_POSM_TYPES, DISPLAY_TYPES, displayTypeAr } from "@/lib/domain";

describe("custom POSM question", () => {
  it("is asked for the three permanent fixtures", () => {
    expect(asksCustomPosm("GE")).toBe(true);
    expect(asksCustomPosm("GMU")).toBe(true);
    expect(asksCustomPosm("Rebrandable")).toBe(true);
  });

  it("is not asked for a campaign stand", () => {
    for (const type of ["50X50", "1x1", "2x1", "2x2", "3x2", "6x2"]) {
      expect(asksCustomPosm(type)).toBe(false);
    }
  });

  it("covers exactly three of the nine types", () => {
    expect(CUSTOM_POSM_TYPES).toHaveLength(3);
    expect(DISPLAY_TYPES.filter(asksCustomPosm)).toEqual(["GE", "GMU", "Rebrandable"]);
  });

  it("ignores an unknown type rather than throwing", () => {
    expect(asksCustomPosm("")).toBe(false);
    expect(asksCustomPosm("9x9")).toBe(false);
  });
});

describe("display type names", () => {
  it("uses the words merchandisers say", () => {
    expect(displayTypeAr("GE")).toBe("القندولة");
    expect(displayTypeAr("Rebrandable")).toBe("استاند حديد قابل لتغيير المواد الدعائية");
  });

  it("passes an unknown type through untouched", () => {
    expect(displayTypeAr("9x9")).toBe("9x9");
  });
});
