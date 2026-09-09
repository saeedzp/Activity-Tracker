export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-brand-dark">متابعة الاستاندات</h1>
        <p className="mt-2 text-sm text-slate-500">
          المرحلة الأولى: قاعدة البيانات ومحرّك المطابقة
        </p>
      </header>
      <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
        شاشة الدخول وشاشة الإدخال تأتي في المرحلة الثانية.
      </section>
    </main>
  );
}
