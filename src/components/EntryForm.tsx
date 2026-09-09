"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BRANDS,
  DISPLAY_TYPES,
  STATUSES,
  isClosing,
  reasonAr,
  reasonCodesFor,
  requiresAltStoreName,
  requiresReasonCode,
  statusAr,
  type Status,
} from "@/lib/domain";

const today = () => new Date().toISOString().slice(0, 10);

type Step = "form" | "review" | "done";

export function EntryForm({ storeId, storeName }: { storeId: string; storeName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [brand, setBrand] = useState("");
  const [displayType, setDisplayType] = useState("");
  const [entered, setEntered] = useState<boolean | null>(null);
  const [entryDate, setEntryDate] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [reasonCode, setReasonCode] = useState("");
  const [altStoreName, setAltStoreName] = useState("");
  const [implDate, setImplDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reasons = status ? reasonCodesFor(status) : [];
  const needsReason = status ? requiresReasonCode(status) : false;
  const needsAltStore = status ? requiresAltStoreName(status) : false;
  const closes = status !== "" && isClosing(status as Status);

  const ready =
    brand !== "" &&
    displayType !== "" &&
    status !== "" &&
    (!needsReason || reasonCode !== "") &&
    (!needsAltStore || altStoreName.trim() !== "");

  function chooseStatus(next: Status) {
    setStatus(next);
    setReasonCode("");
    setAltStoreName("");
    if (isClosing(next) && !implDate) setImplDate(today());
  }

  /**
   * A stand that never arrived cannot have been put up here, so answering "no"
   * settles the status and moves straight to picking why.
   */
  function chooseEntered(value: boolean) {
    setEntered(value);
    if (value) {
      if (!entryDate) setEntryDate(today());
      return;
    }
    setEntryDate("");
    if (status === "" || isClosing(status as Status)) {
      setStatus("Not Implemented");
      setReasonCode("");
      setAltStoreName("");
    }
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
          entered,
          entry_date: entered ? entryDate || null : null,
          implementation_date: implDate || null,
          status,
          reason_code: needsReason ? reasonCode : null,
          alt_store_name: needsAltStore ? altStoreName.trim() : null,
          note: note.trim() || null,
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

  if (step === "done") {
    return (
      <Done
        storeName={storeName}
        brand={brand}
        displayType={displayType}
        closed={closes}
        onAnother={() => {
          setBrand("");
          setDisplayType("");
          setEntered(null);
          setEntryDate("");
          setStatus("");
          setReasonCode("");
          setAltStoreName("");
          setImplDate("");
          setNote("");
          setStep("form");
        }}
        onBack={() => {
          router.push("/stores");
          router.refresh();
        }}
      />
    );
  }

  if (step === "review") {
    return (
      <div className="pb-24">
        <h1 className="text-lg font-bold">تأكيد المعلومات</h1>
        <p className="mb-4 text-sm text-[var(--mute)]">
          راجعها قبل الإرسال. ما ينحذف بعد الإرسال، بس تقدر ترسل تحديثاً جديداً.
        </p>

        <dl className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
          <Row label="السوق" value={storeName} />
          <Row label="البراند" value={brand} />
          <Row label="نوع الاستاند" value={displayType} />
          <Row
            label="دخل الاستاند"
            value={entered === null ? "—" : entered ? `نعم${entryDate ? ` · ${entryDate}` : ""}` : "لا"}
          />
          <Row label="الحالة" value={statusAr(status as Status)} />
          {needsReason && <Row label="كود السبب" value={reasonAr(reasonCode)} />}
          {needsAltStore && <Row label="السوق الفعلي" value={altStoreName} />}
          <Row label="تاريخ التطبيق" value={implDate || "—"} />
          {note.trim() && <Row label="ملاحظة" value={note.trim()} />}
        </dl>

        <div
          className={`mt-3 rounded-xl p-3 text-sm ${
            closes
              ? "bg-[var(--ok-soft)] text-[var(--ok)]"
              : "bg-[var(--amber-soft)] text-[var(--amber)]"
          }`}
        >
          {closes
            ? "هذي الحالة تقفل السطر ويخرج من قائمتك."
            : "هذي الحالة تبقي السوق مفتوحاً في قائمتك."}
        </div>

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
      <div className="grid grid-cols-2 gap-2">
        {BRANDS.map((b) => (
          <button
            key={b.name}
            type="button"
            onClick={() => setBrand(b.name)}
            className={`rounded-xl border p-3 text-right font-bold ${
              brand === b.name
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-white"
            }`}
          >
            <span className="mb-1 block h-1.5 w-8 rounded-full" style={{ background: b.color }} />
            {b.name}
          </button>
        ))}
      </div>

      <Label>نوع الاستاند</Label>
      <div className="flex flex-wrap gap-2">
        {DISPLAY_TYPES.map((t) => (
          <Chip key={t} active={displayType === t} onClick={() => setDisplayType(t)}>
            {t}
          </Chip>
        ))}
      </div>

      <Label>دخل الاستاند للسوق؟</Label>
      <div className="flex gap-2">
        <Chip active={entered === true} onClick={() => chooseEntered(true)}>
          نعم
        </Chip>
        <Chip active={entered === false} onClick={() => chooseEntered(false)}>
          لا
        </Chip>
      </div>
      {entered === true && (
        <>
          <Label>تاريخ دخول الاستاند</Label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full rounded-xl border border-[var(--line)] bg-white p-3"
          />
        </>
      )}
      {entered === false && (
        <p className="mt-2 rounded-lg bg-[var(--amber-soft)] px-3 py-2 text-xs text-[var(--amber)]">
          الاستاند ما دخل، فاخترنا لك «لم يتم التطبيق». حدّد السبب تحت.
        </p>
      )}

      <Label>الحالة</Label>
      <div className="flex flex-col gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => chooseStatus(s)}
            className={`rounded-xl border p-3 text-right font-bold ${
              status === s
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--line)] bg-white"
            }`}
          >
            {statusAr(s)}
          </button>
        ))}
      </div>

      {needsReason && (
        <>
          <Label>كود السبب</Label>
          <div className="flex flex-wrap gap-2">
            {reasons.map((code) => (
              <Chip key={code} active={reasonCode === code} onClick={() => setReasonCode(code)}>
                {reasonAr(code)}
              </Chip>
            ))}
          </div>
        </>
      )}

      {needsAltStore && (
        <>
          <Label>اسم السوق الفعلي</Label>
          <input
            type="text"
            value={altStoreName}
            onChange={(e) => setAltStoreName(e.target.value)}
            placeholder="اكتب اسم السوق اللي تم التطبيق فيه"
            className="w-full rounded-xl border border-[var(--line)] bg-white p-3"
          />
        </>
      )}

      <Label>تاريخ التطبيق</Label>
      <input
        type="date"
        value={implDate}
        onChange={(e) => setImplDate(e.target.value)}
        className="w-full rounded-xl border border-[var(--line)] bg-white p-3"
      />

      <Label>ملاحظة (اختياري)</Label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="min-h-[74px] w-full rounded-xl border border-[var(--line)] bg-white p-3"
      />

      <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--amber-soft)] p-3 text-xs text-[var(--mute)]">
        رفع الصور يحتاج إعداد التخزين، ويُضاف قريباً. الإدخال ينحفظ بدونها الآن.
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setStep("review")}
        disabled={!ready}
        className="mt-4 w-full rounded-xl bg-[var(--ink)] p-3.5 font-bold text-white disabled:opacity-35"
      >
        مراجعة وإرسال
      </button>
    </div>
  );
}

function Done({
  storeName,
  brand,
  displayType,
  closed,
  onAnother,
  onBack,
}: {
  storeName: string;
  brand: string;
  displayType: string;
  closed: boolean;
  onAnother: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-[70dvh] flex-col justify-center pb-24 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--ok-soft)] text-3xl text-[var(--ok)]">
        ✓
      </div>
      <h1 className="text-xl font-bold">تم الإرسال</h1>
      <p className="mt-2 text-sm text-[var(--mute)]">
        {storeName} · {brand} · {displayType}
      </p>
      <p
        className={`mx-auto mt-4 max-w-xs rounded-xl px-3 py-2 text-sm ${
          closed
            ? "bg-[var(--ok-soft)] text-[var(--ok)]"
            : "bg-[var(--amber-soft)] text-[var(--amber)]"
        }`}
      >
        {closed
          ? "السطر أُقفل وخرج من قائمتك."
          : "السوق باقٍ في قائمتك لأن الحالة ما تقفل."}
      </p>

      <button
        type="button"
        onClick={onAnother}
        className="mt-6 w-full rounded-xl bg-[var(--ink)] p-3.5 font-bold text-white"
      >
        إدخال آخر لنفس السوق
      </button>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 w-full rounded-xl border border-[var(--line)] bg-white p-3.5 font-bold"
      >
        رجوع لأسواقك
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--line)] px-3.5 py-2.5 last:border-0">
      <dt className="text-sm text-[var(--mute)]">{label}</dt>
      <dd className="text-sm font-bold">{value}</dd>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 mt-4 block text-sm text-[var(--mute)]">{children}</label>;
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-bold ${
        active ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white"
      }`}
    >
      {children}
    </button>
  );
}
