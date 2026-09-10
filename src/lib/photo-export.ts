/**
 * How the month's photos are laid out for download.
 *
 * The tree is campaign -> region -> city -> store, so the file name itself
 * needs to carry only the store: everything else is already the path it sits
 * in.
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
 * Group the month's photos into one bundle per region, each file named for its
 * store.
 *
 * Two photos of the same store in the same campaign would collide, so the
 * second onward are numbered. The order is fixed rather than incidental: the
 * same month exported twice produces the same names, so a re-download does not
 * look like a different set of photos.
 */
export function planExport(photos: ExportPhoto[]): RegionBundle[] {
  const sorted = [...photos].sort(
    (a, b) =>
      (a.activityName ?? "").localeCompare(b.activityName ?? "", "en") ||
      (a.region ?? "").localeCompare(b.region ?? "", "en") ||
      (a.city ?? "").localeCompare(b.city ?? "", "en") ||
      (a.storeName ?? "").localeCompare(b.storeName ?? "", "en") ||
      a.key.localeCompare(b.key),
  );

  const bundles = new Map<string, ExportFile[]>();
  const taken = new Set<string>();

  for (const photo of sorted) {
    const activity = segment(photo.activityName, NO_CAMPAIGN);
    const region = segment(photo.region, UNKNOWN);
    const city = segment(photo.city, UNKNOWN);
    const store = segment(photo.storeName, UNKNOWN);

    const folder = `${activity}/${region}/${city}`;
    let path = `${folder}/${store}.jpg`;
    for (let n = 2; taken.has(path); n++) path = `${folder}/${store}-${n}.jpg`;
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
