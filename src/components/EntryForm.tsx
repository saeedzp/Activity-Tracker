"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  asksCustomPosm,
  DISPLAY_TYPES,
  displayTypeAr,
  reasonAr,
  reasonCodesFor,
  type Status,
} from "@/lib/domain";
import { formatDateAr, todayIso } from "@/lib/dates";
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
 * Asking "did it go in?" once — rather than asking about entry and then about
 * implementation — matches how the job is actually done.
 */
const ANSWERS = [
  { key: "yes", label: "نعم، دخل السوق", status: "Implemented" },
  { key: "no", label: "لا، ما دخل", status: "Not Implemented" },
  { key: "other", label: "دخل سوق آخر", status: "Implemented in another store" },
] as const;

type AnswerKey = (typeof ANSWERS)[number]["key"];
type Step = "form" | "review" | "done";

export function EntryForm({
  storeId,
  storeName,
  activities,
  planograms = [],
}: {
  storeId: string;
  storeName: string;
  activities: ActivityOption[];
  planograms?: PlanogramOption[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [activityId, setActivityId] = useState("");
  const [displayType, setDisplayType] = useState("");
  const [answer, setAnswer] = useState<AnswerKey | "">("");
  const [reasonCode, setReasonCode] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [altStoreName, setAltStoreName] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [customPosm, setCustomPosm] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const [error, setError] = useState("");

  const activity = activities.find((a) => a.id === activityId);
  /** The campaign's drawings — usually one, sometimes more than one file. */
  const activityPlanograms = activityId
    ? planograms.filter((p) => p.activity_id === activityId)
    : [];
  const status = (ANSWERS.find((a) => a.key === answer)?.status ?? "") as Status | "";
  const wentIn = answer === "yes";
  const didNot = answer === "no";
  const elsewhere = answer === "other";
  const needsOtherText = didNot && reasonCode === "Other";
  // Only worth asking once the stand is actually in the store.
  const needsPosmAnswer = wentIn && asksCustomPosm(displayType);

  const ready =
    activityId !== "" &&
    displayType !== "" &&
    answer !== "" &&
    (!wentIn || photos.length >= 1) &&
    (!didNot || reasonCode !== "") &&
    (!needsOtherText || otherReason.trim() !== "") &&
    (!elsewhere || altStoreName.trim() !== "") &&
    (!needsPosmAnswer || customPosm !== null);

  function chooseDisplayType(type: string) {
    setDisplayType(type);
    if (!asksCustomPosm(type)) setCustomPosm(null);
  }

  function chooseAnswer(key: AnswerKey) {
    setAnswer(key);
    setReasonCode("");
    setOtherReason("");
    setAltStoreName("");
    // Photos only belong to an answer that claims the stand is there.
    if (key !== "yes") {
      setPhotos([]);
      setCustomPosm(null);
    }
    if (key !== "no" && !entryDate) setEntryDate(todayIso());
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
      form.append("activity_id", activityId);
      let res: Response;
      try {
        res = await fetch("/api/photos", { method: "POST", body: form });
      } catch {
        setError("تعذّر رفع الصور، تأكد من الشبكة وحاول مرة ثانية");
        return null;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "تعذّر رفع الصور، حاول مرة ثانية");
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
          activity_id: activityId,
          display_type: displayType,
          entered: wentIn,
          entry_date: wentIn ? entryDate || null : null,
          implementation_date: wentIn || elsewhere ? entryDate || null : null,
          status,
          reason_code: didNot ? reasonCode : null,
          alt_store_name: elsewhere ? altStoreName.trim() : null,
          note: needsOtherText ? otherReason.trim() : null,
          custom_posm: needsPosmAnswer ? customPosm : null,
          photos: keys,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر الحفظ");
        setStep("form");
        return;
      }
      setStep("done");
    } catch {
      setError("تعذّر الاتصال، حاول مرة ثانية");
      setStep("form");
    } finally {
      setBusy(false);
      setUploaded(0);
    }
  }

  function reset() {
    setActivityId("");
    setDisplayType("");
    setAnswer("");
    setReasonCode("");
    setOtherReason("");
    setAltStoreName("");
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
        <h1 className="text-xl font-bold">تم الإرسال</h1>
        <p className="mt-2 text-sm text-[var(--mute)]">
          {storeName} · {activity?.name} · {displayTypeAr(displayType)}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 w-full rounded-xl bg-[var(--ink)] p-3.5 font-bold text-white"
        >
          إدخال آخر لنفس السوق
        </button>
        <button
          type="button"
          onClick={() => {
            router.push("/stores");
            router.refresh();
          }}
          className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white p-3.5 font-bold"
        >
          رجوع لأسواقك
        </button>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="pb-24">
        <h1 className="text-lg font-bold">تأكيد المعلومات</h1>
        <p className="mb-4 text-sm text-[var(--mute)]">راجعها قبل الإرسال.</p>

        <dl className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
          <Row label="السوق" value={storeName} />
          <Row label="الاكتفيتي" value={activity?.name ?? "—"} />
          <Row label="البراندات" value={activity?.brands.join(" · ") ?? "—"} />
          <Row label="المقاس" value={displayTypeAr(displayType)} />
          <Row label="دخل الاستاند" value={ANSWERS.find((a) => a.key === answer)?.label ?? "—"} />
          {didNot && <Row label="السبب" value={reasonAr(reasonCode)} />}
          {needsOtherText && <Row label="تفاصيل السبب" value={otherReason.trim()} />}
          {elsewhere && <Row label="السوق الفعلي" value={altStoreName.trim()} />}
          {!didNot && <Row label="التاريخ" value={formatDateAr(entryDate)} />}
          {needsPosmAnswer && (
            <Row label="مواد دعائية مخصصة" value={customPosm ? "نعم" : "لا"} />
          )}
          {wentIn && <Row label="الصور" value={`${photos.length}`} />}
        </dl>

        {wentIn && photos.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={index}
                src={photo.dataUrl}
                alt={`صورة ${index + 1}`}
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
            ? "تأكيد وإرسال"
            : photos.length > 0 && uploaded < photos.length
              // Naming the photo being sent turns a frozen button on a weak
              // signal into something that is visibly still working.
              ? `جارٍ رفع الصور ${uploaded + 1}/${photos.length}…`
              : "جارٍ الإرسال…"}
        </button>
        <button
          type="button"
          onClick={() => setStep("form")}
          disabled={busy}
          className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white p-3.5 font-bold"
        >
          تعديل
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <a href="/stores" className="mb-3 inline-block text-sm text-[var(--mute)]">
        → رجوع لأسواقك
      </a>
      <h1 className="text-lg font-bold">{storeName}</h1>

      <Label>الاكتفيتي</Label>
      {activities.length === 0 ? (
        <p className="rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--mute)]">
          ما فيه اكتفيتي مضاف لهذا الشهر بعد.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {activities.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setActivityId(a.id)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-right ${
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
                <b className="block text-sm">شوف البلانوغرام</b>
                <span className="block text-xs text-[var(--mute)]">
                  {p.title ?? "أشكال الاستاندات والأصناف اللي عليها"}
                </span>
              </span>
              <span className="text-[var(--mute)]">‹</span>
            </a>
          ))}
        </div>
      )}

      <Label>المقاس</Label>
      <div className="flex flex-col gap-2">
        {DISPLAY_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => chooseDisplayType(t)}
            className={`rounded-xl border p-3 text-right text-sm font-bold ${
              displayType === t
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-white"
            }`}
          >
            {displayTypeAr(t)}
          </button>
        ))}
      </div>

      <Label>هل تم إدخال الاستاند للسوق؟</Label>
      <div className="flex flex-col gap-2">
        {ANSWERS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => chooseAnswer(a.key)}
            className={`rounded-xl border p-3 text-right font-bold ${
              answer === a.key
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-white"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {needsPosmAnswer && (
        <>
          <Label>هل تم تركيب مواد دعائية مخصصة؟</Label>
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
              نعم
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
              لا
            </button>
          </div>
        </>
      )}

      {wentIn && (
        <>
          <Label>صورة الاستاند</Label>
          <PhotoPicker photos={photos} onChange={setPhotos} requiredCount={1} />
          <Label>تاريخ الدخول</Label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-white p-3"
          />
          {entryDate && (
            <p className="mt-1.5 text-xs text-[var(--mute)]">{formatDateAr(entryDate)}</p>
          )}
        </>
      )}

      {didNot && (
        <>
          <Label>وش السبب؟</Label>
          <div className="flex flex-wrap gap-2">
            {reasonCodesFor("Not Implemented").map((code) => (
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
                {reasonAr(code)}
              </button>
            ))}
          </div>

          {needsOtherText && (
            <>
              <Label>اكتب السبب</Label>
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="وضّح وش صار"
                className="min-h-[74px] w-full rounded-xl border border-[var(--line)] bg-white p-3"
              />
            </>
          )}

          <p className="mt-3 rounded-lg bg-[var(--amber-soft)] px-3 py-2 text-xs text-[var(--amber)]">
            السوق يبقى في قائمتك، وترجع تسجّل فيه لما يدخل الاستاند.
          </p>
        </>
      )}

      {elsewhere && (
        <>
          <Label>اسم السوق الفعلي</Label>
          <input
            type="text"
            value={altStoreName}
            onChange={(e) => setAltStoreName(e.target.value)}
            placeholder="اكتب اسم السوق اللي دخله الاستاند"
            className="w-full rounded-xl border border-[var(--line)] bg-white p-3"
          />
          <Label>التاريخ</Label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-white p-3"
          />
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
        مراجعة وإرسال
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
