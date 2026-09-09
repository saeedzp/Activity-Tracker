"use client";

import { useRef, useState } from "react";

interface Result {
  file: string;
  stores: number;
  users: number;
  added: number;
  changed: number;
  unchanged: number;
  deactivated: number;
  newUsers: number;
  deactivatedNames: string[];
}

/**
 * Route upload.
 *
 * The file is the month's route: drop it and it is written. The summary
 * afterwards is a receipt, not a gate — but it names the stores that were
 * switched off, which is how a partial file gets noticed straight away rather
 * than days later when an employee reports a store missing.
 */
export function RouteUploader({
  storeCount,
  userCount,
}: {
  storeCount: number;
  userCount: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dropping, setDropping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/route/apply", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر التحديث");
        return;
      }
      setResult(data);
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--mute)]">
        محفوظ الآن: <b className="text-[var(--ink)]">{storeCount}</b> سوق ·{" "}
        <b className="text-[var(--ink)]">{userCount}</b> موظف
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropping(false);
          const file = e.dataTransfer.files?.[0];
          if (file) upload(file);
        }}
        onClick={() => !busy && input.current?.click()}
        className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-12 text-center ${
          dropping ? "border-[var(--amber)] bg-[var(--amber-soft)]" : "border-[var(--line)] bg-white"
        } ${busy ? "opacity-60" : ""}`}
      >
        <span className="text-3xl">⬆</span>
        <b className="mt-2 block">{busy ? "جارٍ التحديث…" : "اسحب ملف الروت هنا"}</b>
        <span className="mt-1 block text-sm text-[var(--mute)]">
          أو اضغط للاختيار · xlsx أو csv
        </span>
      </div>

      <input
        ref={input}
        type="file"
        accept=".xlsx,.csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
        className="hidden"
      />

      {error && (
        <p className="mt-3 rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-[var(--ok)] bg-[var(--ok-soft)] p-4">
          <h2 className="font-bold text-[var(--ok)]">تم تحديث الروت</h2>
          <p className="mt-1 text-sm">
            {result.file} · <b>{result.stores}</b> سوق · <b>{result.users}</b> موظف
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Tally label="جديد" value={result.added} />
            <Tally label="تغيّر" value={result.changed} />
            <Tally label="بدون تغيير" value={result.unchanged} />
            {result.newUsers > 0 && <Tally label="موظف جديد" value={result.newUsers} />}
          </div>

          {result.deactivated > 0 && (
            <div className="mt-3 rounded-lg border border-[var(--warn)] bg-white p-3">
              <b className="text-sm text-[var(--warn)]">
                {result.deactivated} سوق تم تعطيله — غير موجود في الملف
              </b>
              <p className="mt-1 text-xs text-[var(--mute)]">
                اختفى من قوائم الموظفين. إدخالاته السابقة باقية، ويرجع تلقائياً لو
                ظهر في ملف قادم. لو العدد أكبر من المتوقع، الملف ناقص — ارفع الكامل.
              </p>
              <ul className="mt-2 space-y-0.5">
                {result.deactivatedNames.map((name) => (
                  <li key={name} className="text-xs text-[var(--mute)]">
                    {name}
                  </li>
                ))}
                {result.deactivated > result.deactivatedNames.length && (
                  <li className="text-xs text-[var(--mute)]">
                    و{result.deactivated - result.deactivatedNames.length} غيرها…
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--mute)]">
        الملف هو الروت: كل سوق فيه يُحفظ، وأي سوق غير موجود فيه يُعطَّل.
        الربط بـ STORE ID، فتغيير اسم السوق يُحدَّث ولا يُنشئ سوقاً جديداً.
      </p>
    </div>
  );
}

function Tally({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-lg bg-white px-2.5 py-1 font-bold">
      {label} {value}
    </span>
  );
}
