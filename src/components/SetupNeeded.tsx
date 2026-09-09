/** Shown instead of a blank 500 when the deployment is missing configuration. */
export function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col justify-center p-5">
      <div className="rounded-xl border border-[var(--amber)] bg-[var(--amber-soft)] p-5">
        <h1 className="text-lg font-bold">الإعداد غير مكتمل</h1>
        <p className="mt-2 text-sm">
          التطبيق منشور، لكن متغيرات البيئة التالية غير مضبوطة على الاستضافة:
        </p>
        <ul className="mt-3 space-y-1">
          {missing.map((name) => (
            <li key={name} className="font-mono text-xs">
              {name}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[var(--mute)]">
          أضفها في إعدادات المشروع على Cloudflare نوع Secret، ثم أعد النشر.
          لتفاصيل أكثر افتح <span className="font-mono">/api/health</span>.
        </p>
      </div>
    </main>
  );
}
