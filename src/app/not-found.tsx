/**
 * Custom 404.
 *
 * Next renders this to a static 404.html, which Cloudflare Pages serves as the
 * fallback whenever the worker is not handling a request. Naming that case here
 * turns "every path 404s" from a mystery into a readable symptom.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center p-5">
      <div className="rounded-xl border border-[var(--line)] bg-white p-5">
        <h1 className="text-lg font-bold">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm text-[var(--mute)]">
          تأكد من الرابط، أو ارجع لصفحة الدخول.
        </p>
        <a
          href="/"
          className="mt-4 inline-block rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-bold text-white"
        >
          صفحة الدخول
        </a>
        {/* If this line appears on a path that should exist — the home page or
            /api/health — the worker is not running and Pages is falling back to
            this static file. The usual cause is a missing nodejs_compat flag. */}
        <p className="mt-6 border-t border-[var(--line)] pt-3 font-mono text-[10px] text-[var(--mute)]">
          activity-tracker · static 404
        </p>
      </div>
    </main>
  );
}
