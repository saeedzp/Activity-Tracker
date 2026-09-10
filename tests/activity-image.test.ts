import { describe, expect, it } from "vitest";
import { checkImage, MAX_IMAGE_CHARS } from "../src/lib/activity-image";

const jpeg = (chars: number) => `data:image/jpeg;base64,${"A".repeat(chars)}`;

describe("checkImage", () => {
  it("accepts a jpeg data url", () => {
    expect(checkImage(jpeg(40))).toEqual({ ok: true, image: jpeg(40) });
  });

  it("treats a missing or empty value as no picture", () => {
    expect(checkImage(undefined)).toEqual({ ok: true, image: null });
    expect(checkImage(null)).toEqual({ ok: true, image: null });
    expect(checkImage("")).toEqual({ ok: true, image: null });
  });

  it("refuses anything that is not an image data url", () => {
    // A remote URL would make the admin screen fetch from wherever it points.
    expect(checkImage("https://example.com/a.jpg").ok).toBe(false);
    // A script data url is the reason the prefix is checked at all.
    expect(checkImage("data:text/html;base64,AAAA").ok).toBe(false);
    expect(checkImage("data:image/svg+xml;base64,AAAA").ok).toBe(false);
    expect(checkImage(42).ok).toBe(false);
  });

  it("refuses a picture too big to sit in the row", () => {
    expect(checkImage(jpeg(MAX_IMAGE_CHARS + 1)).ok).toBe(false);
  });
});
