import { t, type Lang } from "@/lib/i18n";

/** Shown instead of a blank 500 when the deployment is missing configuration. */
export function SetupNeeded({ missing, lang }: { missing: string[]; lang: Lang }) {
  const s = t(lang).setup;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center p-5">
      <div className="rounded-xl border border-[var(--amber)] bg-[var(--amber-soft)] p-5">
        <h1 className="text-lg font-bold">{s.title}</h1>
        <p className="mt-2 text-sm">{s.body}</p>
        <ul className="mt-3 space-y-1">
          {missing.map((name) => (
            <li key={name} className="font-mono text-xs">
              {name}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[var(--mute)]">
          {s.hint} <span className="font-mono">/api/health</span>
        </p>
      </div>
    </main>
  );
}
