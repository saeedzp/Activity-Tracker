import { describe, expect, it } from "vitest";
import { planExport, segment, zipName, type ExportPhoto } from "../src/lib/photo-export";

const photo = (over: Partial<ExportPhoto> = {}): ExportPhoto => ({
  key: "2026-09/AM260/a.jpg",
  activityName: "العودة للمدارس",
  region: "West",
  city: "Jeddah",
  storeName: "Panda Al Rawabi",
  ...over,
});

describe("segment", () => {
  it("keeps an ordinary name as it is", () => {
    expect(segment("Panda Al Rawabi", "x")).toBe("Panda Al Rawabi");
  });

  it("refuses to let a name break out of its folder", () => {
    expect(segment("../../etc", "x")).toBe(".. .. etc");
    expect(segment("a/b", "x")).toBe("a b");
    expect(segment("a\\b", "x")).toBe("a b");
  });

  it("drops what Windows will not open", () => {
    expect(segment('a:b*c?"d<e>f|g', "x")).toBe("a b c d e f g");
    expect(segment("name.", "x")).toBe("name");
  });

  it("falls back when there is nothing left", () => {
    expect(segment("", "غير محدد")).toBe("غير محدد");
    expect(segment(null, "غير محدد")).toBe("غير محدد");
    expect(segment("///", "غير محدد")).toBe("غير محدد");
  });
});

describe("planExport", () => {
  it("files a photo under campaign, region and city, named for the store", () => {
    const [bundle] = planExport([photo()]);
    expect(bundle.region).toBe("West");
    expect(bundle.files[0].path).toBe("العودة للمدارس/West/Jeddah/Panda Al Rawabi.jpg");
  });

  it("numbers a second photo of the same store instead of losing it", () => {
    const files = planExport([
      photo({ key: "k1" }),
      photo({ key: "k2" }),
      photo({ key: "k3" }),
    ])[0].files;
    expect(files.map((f) => f.path)).toEqual([
      "العودة للمدارس/West/Jeddah/Panda Al Rawabi.jpg",
      "العودة للمدارس/West/Jeddah/Panda Al Rawabi-2.jpg",
      "العودة للمدارس/West/Jeddah/Panda Al Rawabi-3.jpg",
    ]);
  });

  it("gives every region its own bundle", () => {
    const bundles = planExport([
      photo({ key: "k1", region: "West" }),
      photo({ key: "k2", region: "Central" }),
      photo({ key: "k3", region: "West" }),
    ]);
    expect(bundles.map((b) => b.region)).toEqual(["Central", "West"]);
    expect(bundles.find((b) => b.region === "West")!.files).toHaveLength(2);
  });

  it("names a row with nothing on it rather than dropping it", () => {
    // A submission from before campaigns existed still has photos worth pulling.
    const [bundle] = planExport([
      photo({ activityName: null, region: null, city: null, storeName: null }),
    ]);
    expect(bundle.region).toBe("غير محدد");
    expect(bundle.files[0].path).toBe("بدون اكتفيتي/غير محدد/غير محدد/غير محدد.jpg");
  });

  it("produces the same names every time it runs", () => {
    const input = [
      photo({ key: "k3", storeName: "Zed" }),
      photo({ key: "k1", storeName: "Alpha" }),
      photo({ key: "k2", storeName: "Alpha" }),
    ];
    const once = planExport(input);
    const twice = planExport([...input].reverse());
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });
});

describe("zipName", () => {
  it("names the file for the month and region", () => {
    expect(zipName("2026-09", "West")).toBe("2026-09-West.zip");
  });
});
