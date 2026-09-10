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
        setError(data.error ?? "Could not update the route");
        return;
      }
      setResult(data);
    } catch {
      setError("Could not connect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--mute)]">
        Currently stored: <b className="text-[var(--ink)]">{storeCount}</b> stores ·{" "}
        <b className="text-[var(--ink)]">{userCount}</b> employees
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
        <b className="mt-2 block">{busy ? "Updating…" : "Drop the route file here"}</b>
        <span className="mt-1 block text-sm text-[var(--mute)]">
          or click to choose · xlsx or csv
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
          <h2 className="font-bold text-[var(--ok)]">Route updated</h2>
          <p className="mt-1 text-sm">
            {result.file} · <b>{result.stores}</b> stores · <b>{result.users}</b> employees
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Tally label="New" value={result.added} />
            <Tally label="Changed" value={result.changed} />
            <Tally label="Unchanged" value={result.unchanged} />
            {result.newUsers > 0 && <Tally label="New employees" value={result.newUsers} />}
          </div>

          {result.deactivated > 0 && (
            <div className="mt-3 rounded-lg border border-[var(--warn)] bg-white p-3">
              <b className="text-sm text-[var(--warn)]">
                {result.deactivated} stores switched off — not in the file
              </b>
              <p className="mt-1 text-xs text-[var(--mute)]">
                Gone from the employees&apos; lists. Past submissions stay, and a
                store returns automatically if it appears in a later file. If this
                number is higher than expected the file is incomplete — upload the
                full one.
              </p>
              <ul className="mt-2 space-y-0.5">
                {result.deactivatedNames.map((name) => (
                  <li key={name} className="text-xs text-[var(--mute)]">
                    {name}
                  </li>
                ))}
                {result.deactivated > result.deactivatedNames.length && (
                  <li className="text-xs text-[var(--mute)]">
                    and {result.deactivated - result.deactivatedNames.length} more…
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--mute)]">
        The file is the route: every store in it is saved, and any store missing
        from it is switched off. Matched on STORE ID, so a renamed store is
        updated rather than created again.
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
