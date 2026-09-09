import { describe, expect, it } from "vitest";
import { groupStores, type StoreRow } from "@/lib/store-list";

const store = (over: Partial<StoreRow> & { id: string }): StoreRow => ({
  name: over.id,
  account: "panda",
  city: "Jeddah",
  region: "west",
  me_id: "1",
  me_name: "Employee",
  ...over,
});

describe("groupStores", () => {
  it("groups by city and account", () => {
    const groups = groupStores([
      store({ id: "a", city: "Jeddah", account: "panda" }),
      store({ id: "b", city: "Jeddah", account: "panda" }),
      store({ id: "c", city: "Abha", account: "othaim" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.title.includes("Jeddah"))?.stores).toHaveLength(2);
  });

  it("keeps the same city apart when the account differs", () => {
    const groups = groupStores([
      store({ id: "a", city: "Jeddah", account: "panda" }),
      store({ id: "b", city: "Jeddah", account: "lulu" }),
    ]);
    expect(groups).toHaveLength(2);
  });

  it("sorts stores inside a group by name", () => {
    const groups = groupStores([
      store({ id: "z", name: "Zahra" }),
      store({ id: "a", name: "Ahmed" }),
    ]);
    expect(groups[0].stores.map((s) => s.name)).toEqual(["Ahmed", "Zahra"]);
  });

  it("survives a store with no city", () => {
    const groups = groupStores([store({ id: "a", city: null })]);
    expect(groups[0].title.startsWith("—")).toBe(true);
  });

  it("returns nothing for an empty list", () => {
    expect(groupStores([])).toEqual([]);
  });
});
