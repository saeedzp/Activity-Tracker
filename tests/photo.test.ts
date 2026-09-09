import { describe, expect, it } from "vitest";
import { formatBytes, MAX_WIDTH, scaleToFit } from "@/lib/photo";

describe("scaleToFit", () => {
  it("leaves an image smaller than the cap alone", () => {
    expect(scaleToFit(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("caps the long edge of a landscape photo", () => {
    const out = scaleToFit(4000, 3000);
    expect(out.width).toBe(MAX_WIDTH);
    expect(out.height).toBe(1200);
  });

  it("caps the long edge of a portrait photo, which is how phones hold", () => {
    const out = scaleToFit(3000, 4000);
    expect(out.height).toBe(MAX_WIDTH);
    expect(out.width).toBe(1200);
  });

  it("keeps the aspect ratio", () => {
    const out = scaleToFit(4032, 3024);
    expect(out.width / out.height).toBeCloseTo(4032 / 3024, 2);
  });

  it("never rounds a dimension down to zero", () => {
    expect(scaleToFit(10000, 3, 1600).height).toBeGreaterThanOrEqual(1);
  });
});

describe("formatBytes", () => {
  it("reads in the unit that suits the size", () => {
    expect(formatBytes(512)).toBe("512 ب");
    expect(formatBytes(2048)).toBe("2 ك.ب");
    expect(formatBytes(3_500_000)).toBe("3.3 م.ب");
  });
});
