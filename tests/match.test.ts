import { describe, expect, it } from "vitest";
import {
  FUZZY_THRESHOLD,
  isUsableStoreNo,
  matchStore,
  nameSimilarity,
  nameTokens,
  normalizeAccount,
  marsRegion,
  normalizeText,
  rankCandidates,
  type StoreRecord,
} from "@/lib/match";

const stores: StoreRecord[] = [
  { id: "W-0001", name: "Panda Sari Street", account: "Panda", mars_code: "100001", retailer_no: "701", city: "Jeddah", region: "West" },
  { id: "W-0002", name: "Panda Al Rawdah", account: "PANDA", mars_code: "100002", retailer_no: "0", city: "Jeddah", region: "West" },
  { id: "S-0003", name: "Bin Dawood Abha Mall", account: "BD", mars_code: "100003", retailer_no: null, city: "Abha", region: "South" },
  { id: "S-0004", name: "Danube South Two", account: "Danube", mars_code: null, retailer_no: "0", city: "SouthCity", region: "South" },
  { id: "W-0005", name: "Othaim Madinah Road", account: "Othaim", mars_code: "100005", retailer_no: "174", city: "Jeddah", region: "West" },
];

describe("normalization", () => {
  it("collapses whitespace and punctuation", () => {
    expect(normalizeText("  Panda   Sari-Street  ")).toBe("panda sari street");
  });

  it("unifies every panda spelling", () => {
    for (const v of ["PANDA", "Panda", "panda", "Panda Retail"]) {
      expect(normalizeAccount(v)).toBe("panda");
    }
  });

  it("unifies every bin dawood spelling", () => {
    for (const v of ["BD", "Bindawood", "Bin Dawood", "bin dawood"]) {
      expect(normalizeAccount(v)).toBe("bin dawood");
    }
  });

  it("maps Tier 3 to other mt", () => {
    expect(normalizeAccount("Tier 3")).toBe("other mt");
    expect(normalizeAccount("tier3")).toBe("other mt");
  });

  it("maps Madinah region to West", () => {
    expect(marsRegion("West", "Medina")).toBe("West - Mad Unit");
    expect(marsRegion("South", "Abha")).toBe("South");
  });

  it("drops generic words from store names", () => {
    expect(nameTokens("Panda Hypermarket Sari Branch")).toEqual(["sari"]);
    expect(nameTokens("Bin Dawood Abha Mall")).toEqual(["abha"]);
  });
});

describe("store number usability", () => {
  it("rejects empty, zero and junk", () => {
    for (const v of ["", "  ", "0", "0000", null, undefined, "N/A"]) {
      expect(isUsableStoreNo(v)).toBe(false);
    }
  });

  it("accepts a real number", () => {
    expect(isUsableStoreNo("100001")).toBe(true);
    expect(isUsableStoreNo(100001)).toBe(true);
  });
});

describe("name similarity", () => {
  it("scores identical significant names at 1", () => {
    expect(nameSimilarity("Panda Sari", "Sari Panda Hypermarket")).toBeCloseTo(1, 5);
  });

  it("scores unrelated names below the threshold", () => {
    expect(nameSimilarity("Panda Sari Street", "Danube South Two")).toBeLessThan(
      FUZZY_THRESHOLD,
    );
  });
});

describe("matchStore stage order", () => {
  it("stage 1: a saved alias beats everything else", () => {
    const result = matchStore(
      { mars_store_no: "100001", mars_store_name: "Panda Sari Street", account: "Panda" },
      stores,
      [{ mars_store_no: "100001", mars_store_name: "Panda Sari Street", account: "PANDA", store_id: "W-0002" }],
    );
    expect(result.store_id).toBe("W-0002");
    expect(result.match_method).toBe("manual");
    expect(result.match_score).toBe(1);
  });

  it("stage 2: store number plus account is an exact match", () => {
    const result = matchStore(
      { mars_store_no: "100003", mars_store_name: "totally different text", account: "Bindawood" },
      stores,
    );
    expect(result.store_id).toBe("S-0003");
    expect(result.match_method).toBe("exact");
  });

  it("stage 2 never fires on a zero store number", () => {
    const result = matchStore(
      { mars_store_no: "0", mars_store_name: "Danube South Two", account: "Danube" },
      stores,
    );
    expect(result.match_method).not.toBe("exact");
    expect(result.store_id).toBe("S-0004");
  });

  it("stage 3: fuzzy name match inside the same account", () => {
    const result = matchStore(
      { mars_store_no: "", mars_store_name: "PANDA HYPER - AL RAWDAH BR", account: "PANDA" },
      stores,
    );
    expect(result.store_id).toBe("W-0002");
    expect(result.match_method).toBe("fuzzy");
    expect(result.match_score).toBeGreaterThanOrEqual(FUZZY_THRESHOLD);
  });

  it("never crosses account boundaries when fuzzy matching", () => {
    const result = matchStore(
      { mars_store_no: "", mars_store_name: "Abha Mall", account: "Panda" },
      stores,
    );
    expect(result.store_id === "S-0003").toBe(false);
  });

  it("flags a weak fuzzy hit for review", () => {
    const result = matchStore(
      { mars_store_no: "", mars_store_name: "Rawda", account: "Panda" },
      stores,
    );
    if (result.match_method === "fuzzy") {
      expect(result.weak).toBe(result.match_score < 0.8);
    }
  });

  it("stage 4: falls through to unlinked with suggestions", () => {
    const result = matchStore(
      { mars_store_no: "0", mars_store_name: "Zzzz Qqqq Vvvv", account: "Panda" },
      stores,
    );
    expect(result.match_method).toBe("unlinked");
    expect(result.store_id).toBeNull();
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe("rankCandidates", () => {
  it("returns at most 3, sorted descending, scoped to the account", () => {
    const out = rankCandidates(
      { mars_store_no: "", mars_store_name: "Panda Rawdah", account: "Panda" },
      stores,
    );
    expect(out.length).toBeLessThanOrEqual(3);
    expect(out.every((c) => normalizeAccount(c.store.account) === "panda")).toBe(true);
    expect(out[0].score).toBeGreaterThanOrEqual(out[out.length - 1].score);
  });
});

describe("stage 2 store number sources", () => {
  it("matches on the Mars code even when retailer_no is 0 or missing", () => {
    const result = matchStore(
      { mars_store_no: "100002", mars_store_name: "no useful name", account: "Panda" },
      stores,
    );
    expect(result.store_id).toBe("W-0002");
    expect(result.match_method).toBe("exact");
  });

  it("falls back to retailer_no when no Mars code matches", () => {
    const result = matchStore(
      { mars_store_no: "701", mars_store_name: "no useful name", account: "Panda" },
      stores,
    );
    expect(result.store_id).toBe("W-0001");
    expect(result.match_method).toBe("exact");
  });

  it("refuses to guess when one number points at two stores", () => {
    const ambiguous: StoreRecord[] = [
      { id: "A", name: "Danube South One", account: "Danube", mars_code: "90000009" },
      { id: "B", name: "Danube South Two", account: "Danube", mars_code: "90000009" },
    ];
    const result = matchStore(
      { mars_store_no: "90000009", mars_store_name: "zzz qqq", account: "Danube" },
      ambiguous,
    );
    expect(result.match_method).not.toBe("exact");
  });

  it("ignores free text sitting in a store number column", () => {
    const dirty: StoreRecord[] = [
      { id: "X", name: "Danube South One", account: "Danube", retailer_no: "Jizan" },
    ];
    const result = matchStore(
      { mars_store_no: "Jizan", mars_store_name: "Danube South One", account: "Danube" },
      dirty,
    );
    expect(result.match_method).not.toBe("exact");
  });
});

describe("marsRegion", () => {
  it("splits the west by city, the way Mars does", () => {
    expect(marsRegion("West", "Jeddah")).toBe("West - Jed Unit");
    expect(marsRegion("West", "Makkah")).toBe("West - Mak Unit");
    expect(marsRegion("West", "Medina")).toBe("West - Mad Unit");
  });

  it("places a city by its province, not its name", () => {
    // Taif is in the Makkah province; Yanbu is in the Madinah province.
    expect(marsRegion("West", "Taif")).toBe("West - Mak Unit");
    expect(marsRegion("West", "Yanbu")).toBe("West - Mad Unit");
  });

  it("reads a unit code in the Region column itself", () => {
    expect(marsRegion("JED", "")).toBe("West - Jed Unit");
    expect(marsRegion("MDN", "")).toBe("West - Mad Unit");
  });

  it("keeps a value already written Mars' way", () => {
    expect(marsRegion("West - Mak Unit", "")).toBe("West - Mak Unit");
  });

  it("names the other regions as Mars names them", () => {
    expect(marsRegion("south", "")).toBe("South");
    expect(marsRegion("Central", "")).toBe("Center");
    expect(marsRegion("eastern", "")).toBe("East");
  });

  it("refuses to guess a unit for an unplaceable western city", () => {
    // A visibly incomplete value can be fixed; a confidently wrong one cannot.
    expect(marsRegion("West", "Somewhere")).toBe("West");
  });

  it("hands back an unknown region rather than dropping it", () => {
    expect(marsRegion("Gulf", "")).toBe("Gulf");
    expect(marsRegion("", "")).toBe("");
  });
});
