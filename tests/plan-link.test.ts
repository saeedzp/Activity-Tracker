import { describe, expect, it } from "vitest";
import { linkToPlan, monthOf, previousMonth, type PlannedActivity } from "@/lib/plan-link";

const planned = (over: Partial<PlannedActivity> & { id: string }): PlannedActivity => ({
  month: "2026-09",
  planned_store_id: "AQ036",
  brand: "Galaxy",
  display_type: "2x2",
  ...over,
});

const entry = { storeId: "AQ036", brand: "Galaxy", displayType: "2x2" };
const inSeptember = new Date("2026-09-15T10:00:00Z");
const inOctober = new Date("2026-10-03T10:00:00Z");

describe("monthOf", () => {
  it("reads the month of a date", () => {
    expect(monthOf(new Date("2026-09-09T22:00:00Z"))).toBe("2026-09");
    expect(monthOf(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
  });
});

describe("previousMonth", () => {
  it("steps back a month", () => {
    expect(previousMonth("2026-09")).toBe("2026-08");
  });

  it("rolls the year back at January", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
  });

  it("leaves a malformed month alone", () => {
    expect(previousMonth("2026")).toBe("2026");
  });
});

describe("linkToPlan", () => {
  it("links to the planned line for the current month", () => {
    const link = linkToPlan(entry, [planned({ id: "a" })], inSeptember);
    expect(link).toEqual({ activity_id: "a", month: "2026-09", offPlan: false });
  });

  it("files a late entry in the month it was actually for", () => {
    // Recorded 3 October against September's plan.
    const link = linkToPlan(entry, [planned({ id: "a", month: "2026-09" })], inOctober);
    expect(link.month).toBe("2026-09");
    expect(link.activity_id).toBe("a");
  });

  it("prefers the current month when both months planned the same line", () => {
    const link = linkToPlan(
      entry,
      [planned({ id: "old", month: "2026-09" }), planned({ id: "new", month: "2026-10" })],
      inOctober,
    );
    expect(link.activity_id).toBe("new");
    expect(link.month).toBe("2026-10");
  });

  it("does not reach further back than one month", () => {
    const link = linkToPlan(entry, [planned({ id: "a", month: "2026-07" })], inOctober);
    expect(link.offPlan).toBe(true);
    expect(link.month).toBe("2026-10");
  });

  it("marks a stand that arrived outside the plan", () => {
    const link = linkToPlan(entry, [], inSeptember);
    expect(link).toEqual({ activity_id: null, month: "2026-09", offPlan: true });
  });

  it("will not match another store, brand or activity type", () => {
    const plan = [planned({ id: "a" })];
    expect(linkToPlan({ ...entry, storeId: "OTHER" }, plan, inSeptember).offPlan).toBe(true);
    expect(linkToPlan({ ...entry, brand: "Twix" }, plan, inSeptember).offPlan).toBe(true);
    expect(linkToPlan({ ...entry, displayType: "GE" }, plan, inSeptember).offPlan).toBe(true);
  });

  it("ignores an activity that was never linked to a store", () => {
    const link = linkToPlan(entry, [planned({ id: "a", planned_store_id: null })], inSeptember);
    expect(link.offPlan).toBe(true);
  });
});
