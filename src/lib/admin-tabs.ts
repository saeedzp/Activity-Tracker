/**
 * The admin tabs.
 *
 * English, like the rest of the admin screens: what they produce — the export,
 * the photo folders — goes to Mars, so the words on screen match the words in
 * the file. The employee screens stay Arabic.
 *
 * Plain module on purpose. Defining these inside the client component and
 * importing them into the server page looks fine and type-checks, but Next
 * replaces a "use client" module with a reference proxy on the server, so the
 * array arrives as an object and any array method on it throws at runtime.
 */

export type TabKey = "activities" | "route" | "planograms" | "history" | "photos";

export const TABS: { key: TabKey; label: string }[] = [
  { key: "activities", label: "Activities" },
  { key: "route", label: "Route" },
  { key: "planograms", label: "Planograms" },
  { key: "history", label: "History" },
  { key: "photos", label: "Photos" },
];

export function tabOf(value: string | undefined): TabKey {
  return TABS.some((t) => t.key === value) ? (value as TabKey) : "activities";
}
