/**
 * How the month's photos are laid out for download.
 *
 * The tree is region -> city -> campaign, and each file is named for the store,
 * the stand size and the side it shows: everything else is already the path it
 * sits in. Region comes first because the feedback is read one city at a time,
 * and a region is the folder that holds its cities.
 *
 * The region folder is the plain region. Mars splits the West into three units
 * (Jed, Mak, Mad), and their export keeps that, but a folder per unit would
 * scatter one region's cities across three folders — so here every unit folds
 * back into "West", with Jeddah, Makkah and Madinah side by side inside it.
 *
 * The whole tree is English, which is the rule for anything that leaves the
 * app. Region, city and store arrive from the route file already English, the
 * campaign name is entered in English exactly as Mars sends it, and the
 * fallbacks here are English too. Nothing is ever transliterated: a folder
 * always matches a name someone actually chose.
 *
 * A download is one region at a time, because a whole month is a large file to
 * pull over one connection. The paths inside stay full anyway, so unzipping
 * several regions into the same folder rebuilds one coherent tree rather than
 * a pile of separate ones.
 */

export interface ExportPhoto {
  key: string;
  /** The campaign name, as entered — English, like everything exported. */
  activityName: string | null;
  region: string | null;
  city: string | null;
  storeName: string | null;
  /** The stand size reported, e.g. 2x2 or GE. */
  displayType?: string | null;
  /** Side of the stand, 1 or 2. Null on photos from before the two sides. */
  position?: number | null;
}

export interface ExportFile {
  /** The R2 key to fetch. */
  key: string;
  /** Where it goes inside the zip. */
  path: string;
}

export interface RegionBundle {
  region: string;
  files: ExportFile[];
}

/** Mars's western units, all filed under the one West folder. */
export function folderRegion(region: string | null | undefined): string | null {
  if (region == null) return null;
  return /^\s*west\b/i.test(region) ? "West" : region;
}

/** English too, so a missing value does not put Arabic into an English tree. */
const UNKNOWN = "Unknown";
const NO_CAMPAIGN = "No Activity";

/** A folder or file name that survives Windows, macOS and Linux alike. */
export function segment(value: string | null | undefined, fallback: string): string {
  const cleaned = (value ?? "")
    // Separators and the characters Windows refuses, plus control codes.
    .replace(/[/\\:*?"<>|]/g, " ")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    // A trailing dot makes a folder unopenable on Windows.
    .replace(/\.+$/, "")
    .slice(0, 80)
    .trim();
  return cleaned || fallback;
}

/**
 * Group the month's photos into one bundle per region.
 *
 * A file is `<store> - <size>-<side>.jpg`. A store reported more than once for
 * the same campaign and size (a "no" first, then the "yes" once applied) would
 * collide, so a repeat takes ` (2)`, ` (3)` and is never lost. The order is
 * fixed rather than incidental: the same month exported twice produces the
 * same names, so a re-download does not look like a different set of photos.
 */
export function planExport(photos: ExportPhoto[]): RegionBundle[] {
  const sorted = [...photos].sort(
    (a, b) =>
      (folderRegion(a.region) ?? "").localeCompare(folderRegion(b.region) ?? "", "en") ||
      (a.city ?? "").localeCompare(b.city ?? "", "en") ||
      (a.activityName ?? "").localeCompare(b.activityName ?? "", "en") ||
      (a.storeName ?? "").localeCompare(b.storeName ?? "", "en") ||
      (a.displayType ?? "").localeCompare(b.displayType ?? "", "en") ||
      (a.position ?? 9) - (b.position ?? 9) ||
      a.key.localeCompare(b.key),
  );

  const bundles = new Map<string, ExportFile[]>();
  const taken = new Set<string>();
  /** Photos without a side are numbered in order, per store and size. */
  const unsided = new Map<string, number>();

  for (const photo of sorted) {
    const region = segment(folderRegion(photo.region), UNKNOWN);
    const city = segment(photo.city, UNKNOWN);
    const activity = segment(photo.activityName, NO_CAMPAIGN);
    const store = segment(photo.storeName, UNKNOWN);
    const size = photo.displayType ? ` - ${segment(photo.displayType, UNKNOWN)}` : "";

    const folder = `${region}/${city}/${activity}`;
    const stem = `${folder}/${store}${size}`;
    let side = photo.position;
    if (side == null) {
      side = (unsided.get(stem) ?? 0) + 1;
      unsided.set(stem, side);
    }
    let path = `${stem}-${side}.jpg`;
    for (let n = 2; taken.has(path); n++) path = `${stem}-${side} (${n}).jpg`;
    taken.add(path);

    const files = bundles.get(region);
    if (files) files.push({ key: photo.key, path });
    else bundles.set(region, [{ key: photo.key, path }]);
  }

  return [...bundles.entries()]
    .map(([region, files]) => ({ region, files }))
    .sort((a, b) => a.region.localeCompare(b.region, "en"));
}

export function zipName(month: string, region: string): string {
  return `${month || "all"}-${segment(region, UNKNOWN)}.zip`;
}
