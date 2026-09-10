import { describe, expect, it } from "vitest";
import { isPhotoKey, MAX_PHOTOS, MAX_PHOTO_BYTES, photoKey } from "../src/lib/photo-key";

describe("photoKey", () => {
  it("files a photo under its campaign month and store", () => {
    expect(photoKey("2026-09", "AM260", "9f2c4a")).toBe("2026-09/AM260/9f2c4a.jpg");
  });

  it("cannot be talked out of its prefix", () => {
    // A store id carrying a slash would otherwise write anywhere in the bucket.
    const key = photoKey("2026-09", "../../etc", "a1");
    expect(key).toBe("2026-09/______etc/a1.jpg");
    expect(key.split("/")).toHaveLength(3);
  });
});

describe("isPhotoKey", () => {
  it("accepts a key we made", () => {
    expect(isPhotoKey(photoKey("2026-09", "AM260", "9f2c4a"))).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isPhotoKey("2026-09/AM260/../../secret.jpg")).toBe(false);
    expect(isPhotoKey("/etc/passwd")).toBe(false);
    expect(isPhotoKey("2026-09/AM260/a1.png")).toBe(false);
    expect(isPhotoKey("AM260/a1.jpg")).toBe(false);
    expect(isPhotoKey(null)).toBe(false);
  });
});

describe("the spending cap", () => {
  it("bounds the worst possible month", () => {
    // 287 stores, every one filing the maximum, is the ceiling on a month.
    const worstBytes = 287 * MAX_PHOTOS * MAX_PHOTO_BYTES;
    expect(worstBytes).toBeLessThan(2 * 1024 ** 3);
  });
});
