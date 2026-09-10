/**
 * The photo bucket, reached through the Pages binding.
 *
 * A binding rather than S3 keys: there is no access key, no secret and nothing
 * to leak from a public repository or to rotate a year from now. The bucket is
 * bound in the Cloudflare dashboard as PHOTOS and reached straight from the
 * request context.
 *
 * The bucket itself stays private. Photos are served back through the app,
 * behind a session, rather than from a public bucket URL — a store photo says
 * which employee was where and when, and a public URL is public to anyone it
 * ever reaches.
 */

import { getRequestContext } from "@cloudflare/next-on-pages";

/** Only the two operations this app performs. */
export interface PhotoBucket {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; size?: number } | null>;
}

/**
 * Null when the binding is not configured, so a deployment without it says so
 * plainly instead of failing deep inside an upload.
 */
export function photoBucket(): PhotoBucket | null {
  try {
    const env = getRequestContext().env as unknown as { PHOTOS?: PhotoBucket };
    return env?.PHOTOS ?? null;
  } catch {
    return null;
  }
}

export function photosConfigured(): boolean {
  return photoBucket() !== null;
}
