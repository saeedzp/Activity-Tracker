/**
 * Photo handling on the phone.
 *
 * Store photos come straight off a phone camera at several megabytes each, on
 * a connection that is often poor. Compressing before upload is the difference
 * between a submission that lands and one that times out in an aisle.
 */

export const MAX_WIDTH = 1600;
export const QUALITY = 0.85;

export interface PreparedPhoto {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

/** Fit within MAX_WIDTH on the long edge, leaving smaller images untouched. */
export function scaleToFit(
  width: number,
  height: number,
  max = MAX_WIDTH,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const ratio = max / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * Decode, downscale and re-encode as JPEG.
 *
 * createImageBitmap applies the EXIF orientation, so a photo taken sideways is
 * not stored upside down — a canvas fed the raw file would keep the rotation.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = scaleToFit(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!blob) throw new Error("could not encode the photo");

  return {
    blob,
    dataUrl: canvas.toDataURL("image/jpeg", QUALITY),
    width,
    height,
    bytes: blob.size,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} ب`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
}
