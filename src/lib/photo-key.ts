/**
 * Where a store photo lives in the bucket, and how much of it we accept.
 *
 * The key is an address, not a secret, but it is also the only way anyone
 * browsing the bucket can make sense of what is in it — so it carries the
 * campaign month and the store, and ends in an unguessable id.
 *
 * The limits here are the real spending cap. Cloudflare offers no hard stop on
 * R2, so the guarantee has to come from the app: a bounded number of photos per
 * submission, each of a bounded size, means the worst possible month is a
 * number we can work out in advance rather than a surprise.
 */

/** Enough for the stand plus a couple of angles; more is not evidence. */
export const MAX_PHOTOS = 4;

/**
 * A 1600px JPEG at quality 0.85 lands around 400 KB, so this is generous
 * headroom for an unusually detailed shot while still refusing a raw upload.
 */
export const MAX_PHOTO_BYTES = 1_200_000;

export const PHOTO_TYPE = "image/jpeg";

/** `2026-09/AM260/9f2c…​.jpg` */
export function photoKey(month: string, storeId: string, id: string): string {
  return `${safe(month)}/${safe(storeId)}/${safe(id)}.jpg`;
}

/**
 * Keys come back from the browser between the upload and the submission, so
 * they are checked before they are stored or read — a key is a path, and a path
 * from a client is never taken on trust.
 */
export function isPhotoKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}\/[\w.-]{1,64}\/[\w-]{1,64}\.jpg$/.test(value);
}

/** Path segments only: no slashes, no dots that could climb out of the prefix. */
function safe(value: string): string {
  return value.replace(/[^\w-]/g, "_").slice(0, 64) || "unknown";
}
