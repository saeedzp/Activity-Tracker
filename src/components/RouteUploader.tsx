"use client";

import { useRef, useState } from "react";
import { FIELD_AR, type RouteDiff, type StoreRecordRow } from "@/lib/route-import";

interface Preview {
  file: string;
  rows: number;
  diff: RouteDiff;
  stores: StoreRecordRow[];
}

/**
 * Route upload in two steps: read the file and show what it would change, then
 * write only after that has been read. Replacing a month's route on the
 * strength of picking the right file is not a bet worth taking.
 */
export function RouteUploader({ storeCount, userCount }: { storeCount: number; userCount: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [dropping, setDropping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ stores: number; users: number; deactivated: number } | null>(
    null,
  );

  async function read(file: File) {
    setBusy(true);
    setError("");
    setDone(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/route/preview", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّرت قراءة الملف");
        return;
      }
      setPreview(data);
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setBusy(false);
    }
  }

  async function apply(deactivateMissing: boolean) {
    if (!preview) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/route/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          stores: preview.stores,
          deactivate: deactivateMissing ? preview.diff.missing.map((s) => s.id) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "تعذّر الحفظ");
        return;
      }
      setDone(data);
      setPreview(null);
    } catch {
      setError("تعذّر الاتصال");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[var(--ok)] bg-[var(--ok-soft)] p-5">
        <h2 className="font-bold text-[var(--ok)]">تم تحديث الروت</h2>
        <p className="mt-2 text-sm">
          {done.stores} سوق · {done.users} موظف
          {done.deactivated > 0 ? ` · ${done.deactivated} سوق تم تعطيله` : ""}
        </p>
        <button
          type="button"
          onClick={() => setDone(null)}
          className="mt-4 rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold"
        >
          رفع ملف آخر
        </button>
      </div>
    );
  }

  if (preview) {
    const { diff } = preview;
    const nothing =
      diff.added.length === 0 &&
      diff.changed.length === 0 &&
      diff.missing.length === 0 &&
      diff.newUsers.length === 0;

    return (
      <div>
        <div className="mb-4 rounded-xl border border-[var(--line)] bg-white p-4">
          <p className="text-sm">
            <b>{preview.file}</b>
            <span className="text-[var(--mute)]"> · {preview.rows} سوق في الملف</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Tally label="جديد" value={diff.added.length} tone="ok" />
            <Tally label="تغيّر" value={diff.changed.length} tone="warn" />
            <Tally label="مفقود من الملف" value={diff.missing.length} tone="bad" />
            <Tally label="بدون تغيير" value={diff.unchanged} tone="mute" />
          </div>
        </div>

        {nothing && (
          <p className="mb-4 rounded-xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--mute)]">
            الملف مطابق لما هو محفوظ. ما فيه شي يتغيّر.
          </p>
        )}

        {diff.added.length > 0 && (
          <Section title={`أسواق جديدة (${diff.added.length})`}>
            <ul className="divide-y divide-[var(--line)]">
              {diff.added.slice(0, 40).map((s) => (
                <li key={s.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                  <span className="font-bold">{s.name}</span>
                  <span className="text-xs text-[var(--mute)]">
                    {s.id} · {s.me_name ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
            {diff.added.length > 40 && <More count={diff.added.length - 40} />}
          </Section>
        )}

        {diff.changed.length > 0 && (
          <Section title={`أسواق تغيّرت (${diff.changed.length})`}>
            <ul className="divide-y divide-[var(--line)]">
              {diff.changed.slice(0, 40).map(({ store, changes }) => (
                <li key={store.id} className="px-3 py-2.5 text-sm">
                  <span className="font-bold">{store.name}</span>
                  <span className="mr-2 text-xs text-[var(--mute)]">{store.id}</span>
                  <ul className="mt-1 space-y-0.5">
                    {changes.map((c) => (
                      <li key={c.field} className="text-xs text-[var(--mute)]">
                        {FIELD_AR[c.field]}:{" "}
                        <span className="text-[var(--warn)] line-through">{c.before || "—"}</span>{" "}
                        ←{" "}
                        <span className="font-bold text-[var(--ok)]">{c.after || "—"}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            {diff.changed.length > 40 && <More count={diff.changed.length - 40} />}
          </Section>
        )}

        {diff.missing.length > 0 && (
          <Section title={`أسواق غير موجودة في الملف (${diff.missing.length})`}>
            <p className="px-3 pb-2 pt-1 text-xs text-[var(--mute)]">
              تقدر تعطّلها فتختفي من قوائم الموظفين. لا تُحذف — إدخالاتها السابقة تبقى.
            </p>
            <ul className="divide-y divide-[var(--line)]">
              {diff.missing.slice(0, 40).map((s) => (
                <li key={s.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                  <span>{s.name}</span>
                  <span className="text-xs text-[var(--mute)]">{s.id}</span>
                </li>
              ))}
            </ul>
            {diff.missing.length > 40 && <More count={diff.missing.length - 40} />}
          </Section>
        )}

        {diff.newUsers.length > 0 && (
          <Section title={`موظفون جدد (${diff.newUsers.length})`}>
            <ul className="divide-y divide-[var(--line)]">
              {diff.newUsers.map((u) => (
                <li key={u.emp_id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                  <span>{u.name}</span>
                  <span className="text-xs text-[var(--mute)]">{u.emp_id}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {error && (
          <p className="mb-3 rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => apply(false)}
            disabled={busy || nothing}
            className="rounded-xl bg-[var(--ink)] px-5 py-3 font-bold text-white disabled:opacity-35"
          >
            {busy ? "جارٍ الحفظ…" : "طبّق التحديث"}
          </button>
          {diff.missing.length > 0 && (
            <button
              type="button"
              onClick={() => apply(true)}
              disabled={busy}
              className="rounded-xl border border-[var(--warn)] px-5 py-3 font-bold text-[var(--warn)] disabled:opacity-35"
            >
              طبّق وعطّل الـ{diff.missing.length} المفقودة
            </button>
          )}
          <button
            type="button"
            onClick={() => setPreview(null)}
            disabled={busy}
            className="rounded-xl border border-[var(--line)] bg-white px-5 py-3 font-bold"
          >
            إلغاء
          </button>
        </div>
      </div>
    );
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
          if (file) read(file);
        }}
        onClick={() => input.current?.click()}
        className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed p-12 text-center ${
          dropping ? "border-[var(--amber)] bg-[var(--amber-soft)]" : "border-[var(--line)] bg-white"
        }`}
      >
        <span className="text-3xl">⬆</span>
        <b className="mt-2 block">{busy ? "جارٍ القراءة…" : "اسحب ملف الروت هنا"}</b>
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
          if (file) read(file);
          e.target.value = "";
        }}
        className="hidden"
      />

      {error && (
        <p className="mt-3 rounded-lg bg-[var(--warn-soft)] px-3 py-2 text-sm text-[var(--warn)]">
          {error}
        </p>
      )}

      <p className="mt-4 text-xs text-[var(--mute)]">
        يُقرأ الملف ويُعرض عليك وش راح يتغيّر قبل ما ينحفظ أي شي. الربط بـ STORE ID،
        فتغيير اسم السوق يُحدَّث ولا يُنشئ سوقاً جديداً.
      </p>
    </div>
  );
}

function Tally({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "warn" | "bad" | "mute";
}) {
  const styles = {
    ok: "bg-[var(--ok-soft)] text-[var(--ok)]",
    warn: "bg-[var(--amber-soft)] text-[var(--amber)]",
    bad: "bg-[var(--warn-soft)] text-[var(--warn)]",
    mute: "bg-[var(--paper)] text-[var(--mute)]",
  }[tone];
  return <span className={`rounded-lg px-2.5 py-1 font-bold ${styles}`}>{label} {value}</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-[var(--line)] bg-white">
      <h2 className="border-b border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function More({ count }: { count: number }) {
  return <p className="px-3 py-2 text-xs text-[var(--mute)]">و{count} غيرها…</p>;
}
