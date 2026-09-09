import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsvRecords } from "@/lib/csv";
import { buildRows } from "../scripts/seed";

const csv = readFileSync(path.join(process.cwd(), "seed", "stores.example.csv"), "utf8");

describe("seed builder", () => {
  const { stores, users } = buildRows(parseCsvRecords(csv));

  it("builds one store per row", () => {
    expect(stores).toHaveLength(2);
    expect(stores[0].id).toBe("W-0001");
  });

  it("unifies the account on the way in", () => {
    expect(stores[0].account).toBe("panda");
    expect(stores[1].account).toBe("bin dawood");
  });

  it("normalizes the region", () => {
    expect(stores[0].region).toBe("west");
  });

  it("derives users and dedupes a shared team leader", () => {
    expect(users.filter((u) => u.role === "tl")).toHaveLength(1);
    expect(users.filter((u) => u.role === "me")).toHaveLength(2);
  });
});

describe("csv parser", () => {
  it("handles quoted commas", () => {
    const rows = parseCsvRecords('a,b\n"x,1",y\n');
    expect(rows[0].a).toBe("x,1");
    expect(rows[0].b).toBe("y");
  });
});
