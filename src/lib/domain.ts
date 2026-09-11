/**
 * Frozen project vocabulary.
 *
 * Storage and export are ALWAYS English. Arabic strings here are display-only.
 * Do not invent statuses, reason codes or display types beyond these lists.
 */

export const STATUSES = [
  "Implemented",
  "Implemented in another store",
  "Not Implemented",
] as const;
export type Status = (typeof STATUSES)[number];

export const REASON_CODES_BY_STATUS = {
  Implemented: ["Low Stock", "POSM not received", "Without POSM"],
  "Implemented in another store": [],
  "Not Implemented": [
    "Account Restriction",
    "Contract Issue",
    "OOS",
    "Space Issue",
    "POSM not received",
    "Stand not received",
    "Stand Damaged",
    "Stand Missing",
    "Store Refused",
    "Store renovation",
    "Store Temporarily Closed",
    "Store Permanently Closed",
    "Other",
  ],
} as const satisfies Record<Status, readonly string[]>;

export type ReasonCode =
  (typeof REASON_CODES_BY_STATUS)[Status][number] extends never
    ? string
    : string;

/** A line closes ONLY on these two statuses. Everything else stays open. */
export const CLOSING_STATUSES: readonly Status[] = [
  "Implemented",
  "Implemented in another store",
];

export function isClosing(status: Status): boolean {
  return CLOSING_STATUSES.includes(status);
}

export function reasonCodesFor(status: Status): readonly string[] {
  return REASON_CODES_BY_STATUS[status];
}

/**
 * A reason code qualifies an implementation that happened anyway (low stock, no
 * POSM), so it is optional there; Not Implemented always owes one.
 */
export function reasonCodeRequired(status: Status): boolean {
  return status === "Not Implemented";
}

/** `Implemented in another store` carries no reason code, but needs the real store name. */
export function requiresAltStoreName(status: Status): boolean {
  return status === "Implemented in another store";
}

export function requiresReasonCode(status: Status): boolean {
  return reasonCodesFor(status).length > 0;
}

export const DISPLAY_TYPES = [
  "50X50",
  "1x1",
  "2x1",
  "2x2",
  "3x2",
  "6x2",
  "GE",
  "GMU",
  "Rebrandable",
] as const;
export type DisplayType = (typeof DISPLAY_TYPES)[number];

/**
 * Arabic names for the display types. Storage and export stay English; these
 * are the words merchandisers use on the floor, so the screen uses them.
 */
export const DISPLAY_TYPE_AR: Record<DisplayType, string> = {
  "50X50": "50×50",
  "1x1": "1×1",
  "2x1": "2×1",
  "2x2": "2×2",
  "3x2": "3×2",
  "6x2": "6×2",
  GE: "القندولة",
  GMU: "GMU",
  Rebrandable: "استاند حديد قابل لتغيير المواد الدعائية",
};

/**
 * Permanent fixtures rather than campaign stands: they stay in the store and
 * get re-dressed, so the question that matters is whether this campaign's own
 * POSM was fitted. The campaign stands carry their branding in the unit itself,
 * so asking there would be meaningless.
 */
export const CUSTOM_POSM_TYPES: readonly DisplayType[] = ["GE", "GMU", "Rebrandable"];

export function asksCustomPosm(type: string): boolean {
  return (CUSTOM_POSM_TYPES as readonly string[]).includes(type);
}

export function displayTypeAr(type: string): string {
  return DISPLAY_TYPE_AR[type as DisplayType] ?? type;
}

/**
 * The Category column Mars reads, one per brand.
 *
 * Taken from the values in their own file rather than invented, because a
 * category they do not recognise is a row they cannot group. "Confections" is
 * spelt the way it is spelt in their August workbook.
 */
export const CATEGORIES = [
  "Chocolate",
  "Gum",
  "Confections",
  "Pet Care",
  "Healthy",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const MATCH_METHODS = ["exact", "fuzzy", "manual", "unlinked"] as const;
export type MatchMethod = (typeof MATCH_METHODS)[number];

export const ROLES = ["me", "tl"] as const;
export type Role = (typeof ROLES)[number];

/* ---------------------------------------------------------------- Arabic UI */

export const STATUS_AR: Record<Status, string> = {
  Implemented: "تم التطبيق",
  "Implemented in another store": "تم التطبيق في سوق آخر",
  "Not Implemented": "لم يتم التطبيق",
};

export const REASON_AR: Record<string, string> = {
  "Low Stock": "نقص مخزون",
  "POSM not received": "لم تصل مواد الدعاية",
  "Without POSM": "بدون مواد دعاية",
  "Account Restriction": "قيود من الأكاونت",
  "Contract Issue": "مشكلة في العقد",
  OOS: "نفاد المنتج",
  "Space Issue": "ما فيه مساحة",
  "Stand not received": "الاستاند ما وصل",
  "Stand Damaged": "الاستاند دامج",
  "Stand Missing": "الاستاند مفقود",
  "Store Refused": "السوق رفض",
  "Store renovation": "السوق تحت التجديد",
  "Store Temporarily Closed": "السوق مقفل مؤقتاً",
  "Store Permanently Closed": "السوق مقفل نهائياً",
  Other: "سبب آخر",
};

/** Brand tiles on the entry screen, with the colour each is drawn in. */
export const BRANDS = [
  { name: "Galaxy", color: "#6D2C7E" },
  { name: "Twix", color: "#C8992B" },
  { name: "Snickers", color: "#6B3F17" },
  { name: "Bounty", color: "#0F5FA6" },
  { name: "Mars", color: "#B4121B" },
  { name: "Maltesers", color: "#8B3E13" },
  { name: "Extra", color: "#1B7F5A" },
  { name: "Skittles", color: "#D2196E" },
] as const;

export type Brand = (typeof BRANDS)[number]["name"];

export const MATCH_METHOD_AR: Record<MatchMethod, string> = {
  exact: "مطابقة دقيقة",
  fuzzy: "مطابقة تقريبية",
  manual: "ربط يدوي",
  unlinked: "غير مربوط",
};

export function statusAr(status: Status): string {
  return STATUS_AR[status] ?? status;
}

export function reasonAr(code: string | null | undefined): string {
  if (!code) return "—";
  return REASON_AR[code] ?? code;
}
