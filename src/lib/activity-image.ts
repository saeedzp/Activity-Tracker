/**
 * The campaign picture, as it is allowed into the database.
 *
 * The browser downscales the picture to a thumbnail before sending it, but the
 * route cannot take that on trust — anyone with the passcode can post whatever
 * they like to /api/activities. So the value is checked here: a JPEG or PNG
 * data URL and nothing else, under a size that keeps a month of campaigns
 * cheap to load on a phone.
 */

/** Roughly 180 KB of image once base64 is undone. */
export const MAX_IMAGE_CHARS = 250_000;

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export type ImageCheck =
  | { ok: true; image: string | null }
  | { ok: false; error: string };

/**
 * `undefined` means the caller said nothing about the picture and the stored
 * one should stay; `null` or an empty string means remove it.
 */
export function checkImage(value: unknown): ImageCheck {
  if (value === undefined) return { ok: true, image: null };
  if (value === null || value === "") return { ok: true, image: null };
  if (typeof value !== "string") return { ok: false, error: "Invalid image" };

  const image = value.trim();
  if (!DATA_URL.test(image)) return { ok: false, error: "Invalid image" };
  if (image.length > MAX_IMAGE_CHARS) return { ok: false, error: "Image too large, choose a smaller one" };
  return { ok: true, image };
}
