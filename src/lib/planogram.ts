/**
 * The planogram file: where it lives, and what counts as one.
 *
 * A drawing of the stand — its shelves and which SKU sits where — that the
 * employee builds against. It is a PDF because that is what arrives from the
 * brand, and it is kept rather than consumed: months later "what did the 2x2
 * look like in September" has to have an answer.
 */

/** Big enough for a detailed drawing, small enough to open on a phone. */
export const MAX_PLANOGRAM_BYTES = 10_000_000;

export const PLANOGRAM_TYPE = "application/pdf";

/** `planograms/2026-09/<uuid>.pdf` */
export function planogramKey(month: string, id: string): string {
  return `planograms/${safe(month)}/${safe(id)}.pdf`;
}

/**
 * Keys come back from the browser, and a key is a path. Checked before it is
 * stored and again before anything is read back through it.
 */
export function isPlanogramKey(value: unknown): value is string {
  return typeof value === "string" && /^planograms\/\d{4}-\d{2}\/[\w-]{1,64}\.pdf$/.test(value);
}

/** A PDF really starts with %PDF-; a renamed .exe does not. */
export function looksLikePdf(head: Uint8Array): boolean {
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  return magic.every((byte, i) => head[i] === byte);
}

function safe(value: string): string {
  return value.replace(/[^\w-]/g, "_").slice(0, 64) || "unknown";
}
