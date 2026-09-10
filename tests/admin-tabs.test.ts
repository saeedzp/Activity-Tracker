import { describe, expect, it } from "vitest";
import { TABS, tabOf } from "@/lib/admin-tabs";

describe("admin tabs", () => {
  it("keeps a known tab", () => {
    for (const tab of TABS) expect(tabOf(tab.key)).toBe(tab.key);
  });

  it("falls back to the campaigns tab for anything else", () => {
    expect(tabOf(undefined)).toBe("activities");
    expect(tabOf("")).toBe("activities");
    expect(tabOf("nope")).toBe("activities");
    expect(tabOf("../etc")).toBe("activities");
  });

  it("is a real array, not a client-component proxy", () => {
    // The page calls .some() on this; importing it from a "use client" module
    // made that throw at runtime while type-checking cleanly.
    expect(Array.isArray(TABS)).toBe(true);
    expect(TABS).toHaveLength(3);
  });

  it("has no duplicate keys", () => {
    expect(new Set(TABS.map((t) => t.key)).size).toBe(TABS.length);
  });
});
