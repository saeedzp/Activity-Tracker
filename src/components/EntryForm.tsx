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

export function EntryForm({ storeId, storeName }: { storeId: string; storeName: string }) {
  const router = useRouter();
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
    // Both closing statuses imply the work happened; default the date to today.
    if (isClosing(next) && !implDate) setImplDate(today());
  }

  async function submit() {
    if (!ready) return;
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
        return;
      }
      router.push("/stores");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال، حاول مرة ثانية");
    } finally {
      setBusy(false);
    }
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
            <span
              className="mb-1 block h-1.5 w-8 rounded-full"
              style={{ background: b.color }}
            />
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
        <Chip active={entered === true} onClick={() => { setEntered(true); if (!entryDate) setEntryDate(today()); }}>
          نعم
        </Chip>
        <Chip active={entered === false} onClick={() => { setEntered(false); setEntryDate(""); }}>
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
        onClick={submit}
        disabled={!ready || busy}
        className="mt-4 w-full rounded-xl bg-[var(--ink)] p-3.5 font-bold text-white disabled:opacity-35"
      >
        {busy ? "جارٍ الحفظ…" : "إرسال"}
      </button>
      {status !== "" && !isClosing(status as Status) && (
        <p className="mt-2 text-center text-xs text-[var(--mute)]">
          هذي الحالة تبقي السوق مفتوحاً في قائمتك.
        </p>
      )}
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
