"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DISPLAY_TYPES,
  displayTypeAr,
  reasonAr,
  reasonCodesFor,
  type Status,
} from "@/lib/domain";
import { formatDateAr, todayIso } from "@/lib/dates";
import { PhotoPicker } from "./PhotoPicker";
import type { PreparedPhoto } from "@/lib/photo";

export interface Brand {
  id: string;
  name: string;
  image_url: string | null;
  color: string;
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
  brands,
}: {
  storeId: string;
  storeName: string;
  brands: Brand[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [brand, setBrand] = useState("");
  const [displayType, setDisplayType] = useState("");
  const [answer, setAnswer] = useState<AnswerKey | "">("");
  const [reasonCode, setReasonCode] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [altStoreName, setAltStoreName] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const status = (ANSWERS.find((a) => a.key === answer)?.status ?? "") as Status | "";
  const wentIn = answer === "yes";
  const didNot = answer === "no";
  const elsewhere = answer === "other";
  const needsOtherText = didNot && reasonCode === "Other";

  const ready =
    brand !== "" &&
    displayType !== "" &&
    answer !== "" &&
    (!wentIn || photos.length >= 1) &&
    (!didNot || reasonCode !== "") &&
    (!needsOtherText || otherReason.trim() !== "") &&
    (!elsewhere || altStoreName.trim() !== "");

  function chooseAnswer(key: AnswerKey) {
    setAnswer(key);
    setReasonCode("");
    setOtherReason("");
    setAltStoreName("");
    // Photos only belong to an answer that claims the stand is there.
    if (key !== "yes") setPhotos([]);
    if (key !== "no" && !entryDate) setEntryDate(todayIso());
    if (key === "yes" && !entryDate) setEntryDate(todayIso());
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          store_id: storeId,
          brand,
          display_type: displayType,
          entered: wentIn,
          entry_date: wentIn ? entryDate || null : null,
          implementation_date: wentIn || elsewhere ? entryDate || null : null,
          status,
          reason_code: didNot ? reasonCode : null,
          alt_store_name: elsewhere ? altStoreName.trim() : null,
          note: needsOtherText ? otherReason.trim() : null,
          photo_count: photos.length,
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
    }
  }

  function reset() {
    setBrand("");
    setDisplayType("");
    setAnswer("");
    setReasonCode("");
    setOtherReason("");
    setAltStoreName("");
    setEntryDate("");
    setPhotos([]);
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
          {storeName} · {brand} · {displayTypeAr(displayType)}
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
          <Row label="البراند" value={brand} />
          <Row label="نوع الاكتفيتي" value={displayTypeAr(displayType)} />
          <Row label="دخل الاستاند" value={ANSWERS.find((a) => a.key === answer)?.label ?? "—"} />
          {didNot && <Row label="السبب" value={reasonAr(reasonCode)} />}
          {needsOtherText && <Row label="تفاصيل السبب" value={otherReason.trim()} />}
          {elsewhere && <Row label="السوق الفعلي" value={altStoreName.trim()} />}
          {!didNot && <Row label="التاريخ" value={formatDateAr(entryDate)} />}
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
          {busy ? "جارٍ الإرسال…" : "تأكيد وإرسال"}
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

      <Label>البراند</Label>
      <div className="grid grid-cols-3 gap-2">
        {brands.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setBrand(b.name)}
            className={`overflow-hidden rounded-xl border text-center ${
              brand === b.name ? "border-[var(--ink)] ring-2 ring-[var(--ink)]" : "border-[var(--line)]"
            }`}
          >
            {b.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.image_url} alt="" className="aspect-square w-full bg-white object-contain p-1.5" />
            ) : (
              <span className="block aspect-square w-full" style={{ background: b.color }} />
            )}
            <span className="block bg-white px-1 py-1.5 text-xs font-bold">{b.name}</span>
          </button>
        ))}
      </div>

      <Label>نوع الاكتفيتي</Label>
      <div className="flex flex-col gap-2">
        {DISPLAY_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setDisplayType(t)}
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
