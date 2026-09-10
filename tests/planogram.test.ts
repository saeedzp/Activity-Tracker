import { describe, expect, it } from "vitest";
import {
  isPlanogramKey,
  looksLikePdf,
  MAX_PLANOGRAM_BYTES,
  planogramKey,
} from "../src/lib/planogram";

describe("planogramKey", () => {
  it("files a planogram under its campaign month", () => {
    expect(planogramKey("2026-09", "abc-123")).toBe("planograms/2026-09/abc-123.pdf");
  });

  it("cannot be talked out of its prefix", () => {
    const key = planogramKey("../..", "a/b");
    expect(key.split("/")).toHaveLength(3);
  });
});

describe("isPlanogramKey", () => {
  it("accepts a key we made", () => {
    expect(isPlanogramKey(planogramKey("2026-09", "abc"))).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isPlanogramKey("planograms/2026-09/../../secret.pdf")).toBe(false);
    expect(isPlanogramKey("2026-09/AM260/a.jpg")).toBe(false);
    expect(isPlanogramKey("planograms/2026-09/a.exe")).toBe(false);
    expect(isPlanogramKey(null)).toBe(false);
  });
});

describe("looksLikePdf", () => {
  it("recognises a PDF by its own first bytes", () => {
    expect(looksLikePdf(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe(true);
  });

  it("is not fooled by a name", () => {
    // A .pdf that starts with MZ is a Windows executable.
    expect(looksLikePdf(new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]))).toBe(false);
    expect(looksLikePdf(new Uint8Array([]))).toBe(false);
  });
});

describe("the size limit", () => {
  it("stays within what a phone will open", () => {
    expect(MAX_PLANOGRAM_BYTES).toBeLessThanOrEqual(10_000_000);
  });
});
