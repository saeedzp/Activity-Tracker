"use client";

import { useRef, useState } from "react";
import { formatBytes, preparePhoto, type PreparedPhoto } from "@/lib/photo";
import { MAX_PHOTOS } from "@/lib/photo-key";
import { t, type Lang } from "@/lib/i18n";

/**
 * Camera-first photo picker.
 *
 * `capture="environment"` opens the rear camera straight away on a phone,
 * which is what someone standing in front of a stand wants; the file browser
 * is still reachable for a photo taken earlier.
 */
export function PhotoPicker({
  photos,
  onChange,
  requiredCount,
  lang,
}: {
  photos: PreparedPhoto[];
  onChange: (next: PreparedPhoto[]) => void;
  requiredCount: number;
  lang: Lang;
}) {
  const s = t(lang).photos;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const prepared: PreparedPhoto[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        prepared.push(await preparePhoto(file));
      }
      if (!prepared.length) return setError(s.choose);
      // A cap the employee can see, rather than an upload refused later: four
      // angles are evidence, forty are a bill.
      const next = [...photos, ...prepared];
      if (next.length > MAX_PHOTOS) {
        setError(`${s.max} ${MAX_PHOTOS}`);
        onChange(next.slice(0, MAX_PHOTOS));
        return;
      }
      onChange(next);
    } catch {
      setError(s.processFailed);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const missing = Math.max(0, requiredCount - photos.length);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div key={index} className="relative overflow-hidden rounded-xl border border-[var(--line)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.dataUrl} alt={s.alt(index + 1)} className="aspect-square w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(photos.filter((_, i) => i !== index))}
              aria-label={s.remove(index + 1)}
              className="absolute left-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-black/65 text-sm text-white"
            >
              ✕
            </button>
            <span className="absolute bottom-0 left-0 right-0 bg-black/55 px-1 py-0.5 text-center text-[10px] text-white">
              {formatBytes(photo.bytes)}
            </span>
          </div>
        ))}

        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-[var(--line)] bg-white text-2xl text-[var(--mute)] disabled:opacity-50"
        >
          {busy ? "…" : "+"}
        </button>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={(e) => add(e.target.files)}
        className="hidden"
      />

      {error && <p className="mt-2 text-xs text-[var(--warn)]">{error}</p>}
      {missing > 0 ? (
        <p className="mt-2 text-xs text-[var(--warn)]">
          {missing === 1 ? s.needOne : s.needMany(missing)}
        </p>
      ) : (
        <p className="mt-2 text-xs text-[var(--mute)]">
          {s.extras}
        </p>
      )}
    </div>
  );
}
