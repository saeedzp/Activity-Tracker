"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  asksCustomPosm,
  BRANDS,
  DISPLAY_TYPES,
  displayTypeText,
  PLANOGRAM_REASONS,
  reasonText,
  type Status,
} from "@/lib/domain";
import { formatDate, todayIso } from "@/lib/dates";
import { t, type Lang } from "@/lib/i18n";
import { PhotoPicker } from "./PhotoPicker";
import type { PreparedPhoto } from "@/lib/photo";

export interface ActivityOption {
  id: string;
  name: string;
  brands: string[];
  /** A picture of the campaign, when the admin added one. */
  image: string | null;
}

/** The campaign's drawing: every stand in it, for the employee to find theirs. */
export interface PlanogramOption {
  id: string;
  activity_id: string;
  title: string | null;
  r2_key: string;
}

/**
 * The one question the whole entry turns on, and the status each answer means.
 * The store comes from the employee's own route and the stand is already in
 * it — whoever received one is the one reporting — so what is left to ask is
 * whether the planogram on it is applied.
 */
const ANSWERS = [
  { key: "yes", label: "answerYes", status: "Implemented" },
  { key: "no", label: "answerNo", status: "Not Implemented" },
] as const;

type AnswerKey = (typeof ANSWERS)[number]["key"];
type Step = "form" | "review" | "done";

export function EntryForm({
  storeId,
  storeName,
  activities,
  planograms = [],
  lang,
}: {
  storeId: string;
  storeName: string;
  activities: ActivityOption[];
  planograms?: PlanogramOption[];
  lang: Lang;
}) {
  const router = useRouter();
  const s = t(lang).entry;
  const [step, setStep] = useState<Step>("form");
  const [activityId, setActivityId] = useState("");
  /** Picked by the employee only when the month has no campaign yet. */
  const [pickedBrands, setPickedBrands] = useState<string[]>([]);
  const [displayType, setDisplayType] = useState("");
  const [answer, setAnswer] = useState<AnswerKey | "">("");
  const [reasonCode, setReasonCode] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [customPosm, setCustomPosm] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const [error, setError] = useState("");

  const activity = activities.find((a) => a.id === activityId);
  const noCampaign = activities.length === 0;
  const brands = noCampaign ? pickedBrands : activity?.brands ?? [];
  /** The campaign's drawings — usually one, sometimes more than one file. */
  const activityPlanograms = activityId
    ? planograms.filter((p) => p.activity_id === activityId)
    : [];
  const status = (ANSWERS.find((a) => a.key === answer)?.status ?? "") as Status | "";
  const wentIn = answer === "yes";
  const didNot = answer === "no";
  // Only worth asking once the planogram is up.
  const needsPosmAnswer = wentIn && asksCustomPosm(displayType);

  const ready =
    (noCampaign ? pickedBrands.length > 0 : activityId !== "") &&
    displayType !== "" &&
    answer !== "" &&
    // Side one is owed on either answer: a yes shows it applied, a no shows
    // what is missing.
    photos.length >= 1 &&
    (!didNot || reasonCode !== "") &&
    (!needsPosmAnswer || customPosm !== null);

  function chooseDisplayType(type: string) {
    setDisplayType(type);
    if (!asksCustomPosm(type)) setCustomPosm(null);
  }

  function chooseAnswer(key: AnswerKey) {
    setAnswer(key);
    setReasonCode("");
    if (key !== "yes") setCustomPosm(null);
    if (key === "yes" && !entryDate) setEntryDate(todayIso());
  }

  /**
   * Put the photos in the bucket, and stop if any of them will not go.
   *
   * The submission is only sent once every photo is stored. An "Implemented"
   * report with no photo behind it is worse than a retry: it reads as proof in
   * the export, and nobody could ever tell which of those rows lost a photo to
   * a weak signal and which was never photographed at all.
   */
  async function uploadPhotos(): Promise<string[] | null> {
    const keys: string[] = [];
    setUploaded(0);
    for (const photo of photos) {
      const form = new FormData();
      form.append("photo", photo.blob, "photo.jpg");
      form.append("store_id", storeId);
      if (activityId) form.append("activity_id", activityId);
      let res: Response;
      try {
        res = await fetch("/api/photos", { method: "POST", body: form });
      } catch {
        setError(s.uploadOffline);
        return null;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? s.uploadFailed);
        return null;
      }
      const { key } = await res.json();
      keys.push(key);
      setUploaded(keys.length);
    }
    return keys;
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const keys = await uploadPhotos();
      if (keys === null) {
        setStep("form");
        return;
      }

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          activity_id: activityId || null,
          brands: noCampaign ? pickedBrands : undefined,
          display_type: displayType,
          entered: wentIn,
          entry_date: wentIn ? entryDate || null : null,
          implementation_date: wentIn ? entryDate || null : null,
          status,
          reason_code: didNot ? reasonCode : null,
          custom_posm: needsPosmAnswer ? customPosm : null,
          photos: keys,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? s.saveFailed);
        setStep("form");
        return;
      }
      setStep("done");
    } catch {
      setError(s.offline);
      setStep("form");
    } finally {
      setBusy(false);
      setUploaded(0);
    }
  }

  function reset() {
    setActivityId("");
    setPickedBrands([]);
    setDisplayType("");
    setAnswer("");
    setReasonCode("");
    setEntryDate("");
    setPhotos([]);
    setUploaded(0);
    setCustomPosm(null);
    setStep("form");
  }

  if (step === "done") {
    return (
      <div className="flex min-h-[70dvh] flex-col justify-center pb-24 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[var(--ok-soft)] text-3xl text-[var(--ok)]">
          ✓
        </div>
        <h1 className="text-xl font-bold">{s.doneTitle}</h1>
        <p className="mt-2 text-sm text-[var(--mute)]">
          {storeName} · {activity?.name ?? brands.join(" · ")} · {displayTypeText(lang, displayType)}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 w-full rounded-xl bg-[var(--ink)] p-3.5 font-bold text-white"
        >
          {s.again}
        </button>
        <button
          type="button"
          onClick={() => {
            router.push("/stores");
            router.refresh();
          }}
          className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white p-3.5 font-bold"
        >
          {s.back}
        </button>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="pb-24">
        <h1 className="text-lg font-bold">{s.confirmTitle}</h1>
        <p className="mb-4 text-sm text-[var(--mute)]">{s.confirmHint}</p>

        <dl className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
          <Row label={s.store} value={storeName} />
          {!noCampaign && <Row label={s.activity} value={activity?.name ?? "—"} />}
          <Row label={s.brands} value={brands.join(" · ") || "—"} />
          <Row label={s.size} value={displayTypeText(lang, displayType)} />
          <Row
            label={s.entered}
            value={answer ? s[ANSWERS.find((a) => a.key === answer)!.label] : "—"}
          />
          {didNot && <Row label={s.reason} value={reasonText(lang, reasonCode)} />}
          {wentIn && <Row label={s.date} value={formatDate(lang, entryDate)} />}
          {needsPosmAnswer && (
            <Row label={s.customPosm} value={customPosm ? t(lang).common.yes : t(lang).common.no} />
          )}
          <Row label={s.photos} value={`${photos.length}`} />
        </dl>

        {photos.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {photos.map((photo, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={photo.dataUrl}
                alt={t(lang).photos.side(index + 1)}
                className="aspect-square w-full rounded-lg border border-[var(--line)] object-cover"
              />
            ))}
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-[var(--ink)] p-3.5 font-bold text-white disabled:opacity-35"
        >
          {!busy
            ? s.send
            : photos.length > 0 && uploaded < photos.length
              // Naming the photo being sent turns a frozen button on a weak
              // signal into something that is visibly still working.
              ? `${s.uploading} ${uploaded + 1}/${photos.length}…`
              : s.sending}
        </button>
        <button
          type="button"
          onClick={() => setStep("form")}
          disabled={busy}
          className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white p-3.5 font-bold"
        >
          {t(lang).common.edit}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <a href="/stores" className="mb-3 inline-block text-sm text-[var(--mute)]">
        → {s.back}
      </a>
      <h1 className="text-lg font-bold">{storeName}</h1>

      <Label>{noCampaign ? s.brandPick : s.activity}</Label>
      {noCampaign ? (
        // No campaign yet this month: the stand still gets reported, against
        // the brands on it. One or more, since a stand can carry several.
        <>
          <p className="mb-2 text-xs text-[var(--mute)]">{s.noActivities}</p>
          <div className="flex flex-wrap gap-2">
            {BRANDS.map((b) => {
              const on = pickedBrands.includes(b.name);
              return (
                <button
                  key={b.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setPickedBrands(
                      on ? pickedBrands.filter((n) => n !== b.name) : [...pickedBrands, b.name],
                    )
                  }
                  className="rounded-lg border-2 px-3.5 py-2 text-sm font-bold"
                  style={
                    on
                      ? { background: b.color, borderColor: b.color, color: "#fff" }
                      : { borderColor: b.color, color: b.color, background: "#fff" }
                  }
                >
                  {b.name}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          {activities.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActivityId(a.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-start ${
                activityId === a.id
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--line)] bg-white"
              }`}
            >
              {a.image && (
                // The picture is why this list is scannable: two campaigns can
                // carry the same brands and differ only in the artwork.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.image}
                  alt=""
                  className="h-14 w-14 flex-none rounded-lg border border-black/10 bg-white object-cover"
                />
              )}
              <span className="min-w-0">
                <span className="block font-bold">{a.name}</span>
                <span
                  className={`mt-0.5 block text-xs ${
                    activityId === a.id ? "opacity-75" : "text-[var(--mute)]"
                  }`}
                >
                  {a.brands.join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {activityPlanograms.length > 0 && (
        // Before the size, not after it: the drawing is what tells the employee
        // which stand arrived, so they read it and then say which one it is.
        <div className="mt-4 flex flex-col gap-2">
          {activityPlanograms.map((p) => (
            <a
              key={p.id}
              href={`/api/planograms/${p.r2_key}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-[var(--amber)] bg-[var(--amber-soft)] p-3.5"
            >
              <span className="text-2xl">📄</span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm">{s.planogram}</b>
                <span className="block text-xs text-[var(--mute)]">
                  {p.title ?? s.planogramHint}
                </span>
              </span>
              <span className="text-[var(--mute)]">‹</span>
            </a>
          ))}
        </div>
      )}

      <Label>{s.size}</Label>
      <div className="flex flex-col gap-2">
        {DISPLAY_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => chooseDisplayType(type)}
            className={`rounded-xl border p-3 text-start text-sm font-bold ${
              displayType === type
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-white"
            }`}
          >
            {displayTypeText(lang, type)}
          </button>
        ))}
      </div>

      <Label>{s.question}</Label>
      <div className="flex flex-col gap-2">
        {ANSWERS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => chooseAnswer(a.key)}
            className={`rounded-xl border p-3 text-start font-bold ${
              answer === a.key
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-white"
            }`}
          >
            {s[a.label]}
          </button>
        ))}
      </div>

      {needsPosmAnswer && (
        <>
          <Label>{s.posmQuestion}</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCustomPosm(true)}
              className={`flex-1 rounded-xl border p-3 font-bold ${
                customPosm === true
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--line)] bg-white"
              }`}
            >
              {t(lang).common.yes}
            </button>
            <button
              type="button"
              onClick={() => setCustomPosm(false)}
              className={`flex-1 rounded-xl border p-3 font-bold ${
                customPosm === false
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--line)] bg-white"
              }`}
            >
              {t(lang).common.no}
            </button>
          </div>
        </>
      )}

      {answer !== "" && (
        <>
          <Label>{s.photoLabel}</Label>
          <PhotoPicker photos={photos} onChange={setPhotos} requiredCount={1} lang={lang} />
        </>
      )}

      {wentIn && (
        <>
          <Label>{s.entryDate}</Label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-white p-3"
          />
          {entryDate && (
            <p className="mt-1.5 text-xs text-[var(--mute)]">{formatDate(lang, entryDate)}</p>
          )}
        </>
      )}

      {didNot && (
        <>
          <Label>{s.reasonQuestion}</Label>
          <div className="flex flex-wrap gap-2">
            {PLANOGRAM_REASONS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setReasonCode(code)}
                className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                  reasonCode === code
                    ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                    : "border-[var(--line)] bg-white"
                }`}
              >
                {reasonText(lang, code)}
              </button>
            ))}
          </div>

          <p className="mt-3 rounded-lg bg-[var(--amber-soft)] px-3 py-2 text-xs text-[var(--amber)]">
            {s.staysOpen}
          </p>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setStep("review")}
        disabled={!ready}
        className="mt-5 w-full rounded-xl bg-[var(--ink)] p-3.5 font-bold text-white disabled:opacity-35"
      >
        {s.review}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--line)] px-3.5 py-2.5 last:border-0">
      <dt className="text-sm text-[var(--mute)]">{label}</dt>
      <dd className="text-left text-sm font-bold">{value}</dd>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 mt-5 block text-sm text-[var(--mute)]">{children}</label>;
}
