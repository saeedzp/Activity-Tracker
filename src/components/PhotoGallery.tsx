"use client";

import { useState } from "react";
import { zipSync } from "fflate";
import { planExport, zipName, type ExportPhoto, type RegionBundle } from "@/lib/photo-export";
import { formatBytesEn } from "@/lib/photo";
import { formatMonthEn } from "@/lib/dates";

/**
 * The month's photos: seen here, pulled down one region at a time.
 *
 * The zip is built in the browser rather than on the server. The photos are
 * private, so every one of them is fetched with the reader's own session — and
 * a whole region of full-size photos is far more than an edge function is meant
 * to hold in memory at once.
 */
export function PhotoGallery({
  photos,
  month,
}: {
  photos: ExportPhoto[];
  month: string;
}) {
  const bundles = planExport(photos);
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState(0);
  const [error, setError] = useState("");

  async function download(bundle: RegionBundle) {
    setBusy(bundle.region);
    setDone(0);
    setError("");
    try {
      const files: Record<string, Uint8Array> = {};
      for (const file of bundle.files) {
        const res = await fetch(`/api/photos/${file.key}`);
        if (!res.ok) throw new Error(file.key);
        files[file.path] = new Uint8Array(await res.arrayBuffer());
        setDone((n) => n + 1);
      }

      // level 0: a JPEG is already compressed, so packing rather than
      // squeezing keeps a large region from locking the page up for minutes.
      const zipped = zipSync(files, { level: 0 });
      const blob = new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = zipName(month, bundle.region);
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not build the file, try again");
    } finally {
      setBusy("");
      setDone(0);
    }
  }

  if (photos.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--mute)]">
        No photos{month ? ` in ${formatMonthEn(month)}` : ""} yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">
          {error}
        </p>
      )}

      {bundles.map((bundle) => (
        <section key={bundle.region} className="rounded-xl border border-[var(--line)] bg-white p-4">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">{bundle.region}</h2>
              <p className="text-xs text-[var(--mute)]">{bundle.files.length} photos</p>
            </div>
            <button
              type="button"
              onClick={() => download(bundle)}
              disabled={busy !== ""}
              className="rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-bold text-white disabled:opacity-35"
            >
              {busy === bundle.region
                ? `Preparing ${done}/${bundle.files.length}…`
                : "Download ZIP"}
            </button>
          </header>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-10">
            {bundle.files.map((file) => (
              <a
                key={file.key}
                href={`/api/photos/${file.key}`}
                target="_blank"
                rel="noreferrer"
                // The path is the caption: campaign, region, city and store.
                title={file.path}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${file.key}`}
                  alt={file.path}
                  loading="lazy"
                  className="aspect-square w-full rounded-lg border border-[var(--line)] object-cover"
                />
              </a>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-[var(--mute)]">
        Inside the file: activity, then region, then city, and the photo named
        after the store. Unzip every region into the same folder and they merge
        into one tree. About {formatBytesEn(400_000)} per photo.
      </p>
    </div>
  );
}
