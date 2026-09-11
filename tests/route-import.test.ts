import { describe, expect, it } from "vitest";
import {
  dedupe,
  diffRoute,
  isNoOp,
  toStore,
  usersFrom,
  type StoreRecordRow,
} from "@/lib/route-import";

const store = (over: Partial<StoreRecordRow> & { id: string }): StoreRecordRow => ({
  name: `Store ${over.id}`,
  account: "panda",
  city: "Jeddah",
  region: "West - Jed Unit",
  mars_code: "100001",
  customer_number: null,
  retailer_no: null,
  me_id: "10001",
  me_name: "Employee One",
  tl_id: "20001",
  tl_name: "Leader One",
  ...over,
});

describe("toStore", () => {
  const row = {
    "STORE ID": "W-0001",
    "MARS Code": "17663813",
    "Store Name": "Panda Sari",
    Region: "Madinah",
    City: "Jeddah",
    "Account Name": "PANDA",
    "Retailer NO.": "0",
    "ME (1) ID": "10001",
    "ME (1) Name": "Employee One",
    "TL ID": "20001",
    "TL Name": "Leader One",
  };

  it("normalizes the account and region on the way in", () => {
    const out = toStore(row)!;
    expect(out.account).toBe("panda");
    // The region is stored the way Mars writes it, split by city.
    expect(out.region).toBe("West - Mad Unit");
  });

  it("drops a retailer number of zero rather than storing it", () => {
    expect(toStore(row)!.retailer_no).toBeNull();
    expect(toStore({ ...row, "Retailer NO.": "701" })!.retailer_no).toBe("701");
  });

  it("drops free text sitting in a number column", () => {
    expect(toStore({ ...row, "MARS Code": "#N/A" })!.mars_code).toBeNull();
    expect(toStore({ ...row, "Retailer NO.": "Jizan" })!.retailer_no).toBeNull();
  });

  it("refuses a row with no store id", () => {
    expect(toStore({ ...row, "STORE ID": "" })).toBeNull();
  });

  it("falls back to the id when the name is blank", () => {
    expect(toStore({ ...row, "Store Name": "", "MARS Store": "" })!.name).toBe("W-0001");
  });
});

describe("dedupe", () => {
  it("keeps the first of a repeated store id", () => {
    const out = dedupe([store({ id: "A", name: "First" }), store({ id: "A", name: "Second" })]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("First");
  });
});

describe("usersFrom", () => {
  it("collects employees and leaders without duplicates", () => {
    const users = usersFrom([store({ id: "A" }), store({ id: "B" })]);
    expect(users).toHaveLength(2);
    expect(users.filter((u) => u.role === "tl")).toHaveLength(1);
  });

  it("treats someone who leads anywhere as a leader", () => {
    const users = usersFrom([
      store({ id: "A", me_id: "500", me_name: "Both" }),
      store({ id: "B", tl_id: "500", tl_name: "Both" }),
    ]);
    expect(users.find((u) => u.emp_id === "500")?.role).toBe("tl");
  });
});

describe("diffRoute", () => {
  const existing = [store({ id: "A" }), store({ id: "B" })];

  it("reports a store the file introduces", () => {
    const diff = diffRoute([...existing, store({ id: "C" })], existing);
    expect(diff.added.map((s) => s.id)).toEqual(["C"]);
    expect(diff.unchanged).toBe(2);
  });

  it("reports a store moved to another employee, naming both sides", () => {
    const moved = store({ id: "A", me_id: "99999", me_name: "Someone Else" });
    const diff = diffRoute([moved, existing[1]], existing);
    expect(diff.changed).toHaveLength(1);
    const fields = diff.changed[0].changes.map((c) => c.field);
    expect(fields).toContain("me_id");
    const change = diff.changed[0].changes.find((c) => c.field === "me_id")!;
    expect(change.before).toBe("10001");
    expect(change.after).toBe("99999");
  });

  it("reports a store the file leaves out without deleting it", () => {
    const diff = diffRoute([existing[0]], existing);
    expect(diff.missing.map((s) => s.id)).toEqual(["B"]);
  });

  it("ignores a store that was already switched off", () => {
    const off = [store({ id: "A" }), store({ id: "B", active: false })];
    expect(diffRoute([off[0]], off).missing).toHaveLength(0);
  });

  it("treats a switched-off store reappearing as a change", () => {
    const off = [store({ id: "A", active: false })];
    const diff = diffRoute([store({ id: "A" })], off);
    expect(diff.changed).toHaveLength(1);
    expect(diff.unchanged).toBe(0);
  });

  it("lists only employees not already on record", () => {
    const diff = diffRoute(existing, existing, ["10001"]);
    expect(diff.newUsers.map((u) => u.emp_id)).toEqual(["20001"]);
  });

  it("says nothing changed when the file repeats what is there", () => {
    const diff = diffRoute(existing, existing, ["10001", "20001"]);
    expect(isNoOp(diff)).toBe(true);
    expect(diff.unchanged).toBe(2);
  });

  it("collapses duplicates before comparing, so they are not false changes", () => {
    const diff = diffRoute([...existing, store({ id: "A", name: "Dup" })], existing, [
      "10001",
      "20001",
    ]);
    expect(isNoOp(diff)).toBe(true);
  });
});
