/**
 * Date display, in both languages the app speaks.
 *
 * The employee screens are Arabic; the admin screens are English, because what
 * they produce goes to Mars. So a date has two renderings and neither is a
 * translation of the other at read time — each is written out here.
 *
 * Dates are stored and exported as ISO, but a merchandiser reading a date on a
 * phone should see the month named the way they say it. Intl's "ar" locale
 * yields the Levantine names (أيلول); Saudi usage is the Latin-derived set
 * (سبتمبر), so the months are named here rather than left to the runtime.
 */

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
] as const;

/** "2026-09-09" -> "٩ سبتمبر ٢٠٢٦"-style, with Western digits for legibility. */
export function formatDateAr(iso: string | null | undefined): string {
  if (!iso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const [, year, month, day] = match;
  const name = MONTHS_AR[Number(month) - 1];
  if (!name) return iso;
  return `${Number(day)} ${name} ${year}`;
}

/** "2026-09" -> "سبتمبر 2026", for the month picker. */
export function formatMonthAr(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const [, year, month] = match;
  const name = MONTHS_AR[Number(month) - 1];
  return name ? `${name} ${year}` : value;
}

/** "2026-09" for a given date — the key every monthly view groups on. */
export function monthOf(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const MONTHS_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "2026-09-09" -> "9 Sep 2026". */
export function formatDateEn(iso: string | null | undefined): string {
  if (!iso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  const [, year, month, day] = match;
  const name = MONTHS_EN[Number(month) - 1];
  return name ? `${Number(day)} ${name} ${year}` : iso;
}

/** "2026-09" -> "Sep 2026", for the month pickers on the admin screens. */
export function formatMonthEn(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const [, year, month] = match;
  const name = MONTHS_EN[Number(month) - 1];
  return name ? `${name} ${year}` : value;
}

export { MONTHS_AR, MONTHS_EN };
