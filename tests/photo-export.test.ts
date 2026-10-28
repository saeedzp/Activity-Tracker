import { describe, expect, it } from "vitest";
import { folderRegion, planExport, segment, zipName, type ExportPhoto } from "../src/lib/photo-export";

const photo = (over: Partial<ExportPhoto> = {}): ExportPhoto => ({
  key: "2026-09/AM260/a.jpg",
  activityName: "Back to School",
  region: "West",
  city: "Jeddah",
  storeName: "Panda Al Rawabi",
  displayType: "2x2",
  position: 1,
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
    expect(segment("", "Unknown")).toBe("Unknown");
    expect(segment(null, "Unknown")).toBe("Unknown");
    expect(segment("///", "Unknown")).toBe("Unknown");
  });
});

describe("planExport", () => {
  it("files a photo under region, city and campaign, named for store, size and side", () => {
    const [bundle] = planExport([photo()]);
    expect(bundle.region).toBe("West");
    expect(bundle.files[0].path).toBe("West/Jeddah/Back to School/Panda Al Rawabi - 2x2-1.jpg");
  });

  it("names the two sides -1 and -2", () => {
    const files = planExport([photo({ key: "k2", position: 2 }), photo({ key: "k1", position: 1 })])[0].files;
    expect(files.map((f) => f.path)).toEqual([
      "West/Jeddah/Back to School/Panda Al Rawabi - 2x2-1.jpg",
      "West/Jeddah/Back to School/Panda Al Rawabi - 2x2-2.jpg",
    ]);
  });

  it("keeps a repeat report of the same store instead of losing it", () => {
    const files = planExport([photo({ key: "k1" }), photo({ key: "k2" })])[0].files;
    expect(files.map((f) => f.path)).toEqual([
      "West/Jeddah/Back to School/Panda Al Rawabi - 2x2-1.jpg",
      "West/Jeddah/Back to School/Panda Al Rawabi - 2x2-1 (2).jpg",
    ]);
  });

  it("numbers photos from before the two sides in order", () => {
    const files = planExport([
      photo({ key: "k1", position: null }),
      photo({ key: "k2", position: null }),
    ])[0].files;
    expect(files.map((f) => f.path)).toEqual([
      "West/Jeddah/Back to School/Panda Al Rawabi - 2x2-1.jpg",
      "West/Jeddah/Back to School/Panda Al Rawabi - 2x2-2.jpg",
    ]);
  });

  it("folds Mars's three western units into one West folder", () => {
    const bundles = planExport([
      photo({ key: "k1", region: "West - Jed Unit", city: "Jeddah" }),
      photo({ key: "k2", region: "West - Mak Unit", city: "Makkah" }),
      photo({ key: "k3", region: "West - Mad Unit", city: "Madinah" }),
    ]);
    expect(bundles.map((b) => b.region)).toEqual(["West"]);
    expect(bundles[0].files.map((f) => f.path.split("/").slice(0, 2).join("/"))).toEqual([
      "West/Jeddah",
      "West/Madinah",
      "West/Makkah",
    ]);
    expect(folderRegion("South")).toBe("South");
    expect(folderRegion("Western")).toBe("Western");
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
      photo({ activityName: null, region: null, city: null, storeName: null, displayType: null }),
    ]);
    expect(bundle.region).toBe("Unknown");
    expect(bundle.files[0].path).toBe("Unknown/Unknown/No Activity/Unknown-1.jpg");
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
