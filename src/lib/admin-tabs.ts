/**
 * The admin tabs.
 *
 * Plain module on purpose. Defining these inside the client component and
 * importing them into the server page looks fine and type-checks, but Next
 * replaces a "use client" module with a reference proxy on the server, so the
 * array arrives as an object and any array method on it throws at runtime.
 */

export type TabKey = "activities" | "route" | "history";

export const TABS: { key: TabKey; label: string }[] = [
  { key: "activities", label: "الاكتفيتي" },
  { key: "route", label: "الروت" },
  { key: "history", label: "السجل" },
];

export function tabOf(value: string | undefined): TabKey {
  return TABS.some((t) => t.key === value) ? (value as TabKey) : "activities";
}
