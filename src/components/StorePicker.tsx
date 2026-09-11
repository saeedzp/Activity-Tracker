"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface StoreOption {
  id: string;
  name: string;
  account: string;
  city?: string | null;
}

/**
 * Searchable store cell.
 *
 * Free typing is deliberately not accepted: the export has to carry a real
 * store, so the operator picks one. What they type only filters the list.
 */
export function StorePicker({
  value,
  stores,
  label,
  onPick,
  onClose,
}: {
  value: string | null;
  stores: StoreOption[];
  label: string;
  onPick: (store: StoreOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? stores.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.account.toLowerCase().includes(q) ||
            (s.city ?? "").toLowerCase().includes(q),
        )
      : stores;
    return pool.slice(0, 60);
  }, [query, stores]);

  return (
    <div className="absolute end-0 top-full z-30 mt-1 w-[320px] rounded-xl border border-[var(--line)] bg-white shadow-lg">
      <div className="border-b border-[var(--line)] p-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && results[0]) onPick(results[0]);
          }}
          placeholder={label}
          className="w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm outline-none focus:border-[var(--amber)]"
        />
      </div>
      <ul className="max-h-64 overflow-y-auto py-1">
        {results.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-[var(--mute)]">
            ما فيه سوق بهذا الاسم
          </li>
        )}
        {results.map((store) => (
          <li key={store.id}>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(store);
              }}
              className={`block w-full px-3 py-2 text-start text-sm hover:bg-[var(--amber-soft)] ${
                store.id === value ? "bg-[var(--amber-soft)] font-bold" : ""
              }`}
            >
              <span className="block">{store.name}</span>
              <span className="block text-xs text-[var(--mute)]">
                {store.account}
                {store.city ? ` · ${store.city}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
