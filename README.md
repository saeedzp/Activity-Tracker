# Activity Tracker

تطبيق ويب لمتابعة تركيب الاستاندات (Displays) في أسواق التجزئة بالسعودية.
الواجهة عربية RTL بالكامل، mobile-first. التخزين والتصدير بالإنجليزي.

## وش يسوي المشروع

- **الموظف** يدخل برقمه الوظيفي فقط، يشوف أسواقه، ويسجّل لكل سوق/براند/نوع استاند:
  هل دخل الاستاند، الحالة، كود السبب، تاريخ التطبيق، والصور.
- **المشرف** يتابع لوحة `/admin`: عدّاد مفتوح/مقفل/لم يرد، اعتماد أو إرجاع الإدخالات،
  ربط سطور مارس غير المطابقة بالأسواق، واستيراد/تصدير ملف مارس.
- **محرّك المطابقة** يربط سطور ملف مارس بأسواقنا على أربع مراحل: ربط محفوظ ← رقم السوق
  والأكاونت ← مطابقة اسم تقريبية داخل نفس الأكاونت ← غير مربوط.

## الستاك

Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + RLS) ·
Cloudflare R2 للصور · النشر على Cloudflare Pages.

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local     # عبّي القيم الحقيقية هنا فقط
npm run dev
```

`.env.local` مستبعد من Git ولا يُرفع أبداً.

### قاعدة البيانات

شغّل الملفات بالترتيب في SQL Editor داخل Supabase:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_rls.sql
```

### السييد

حوّل ملف الأسواق الأصلي إلى CSV (الاثنان يبقيان محليين — مستبعدان من Git،
والمرفوع بدلهما `seed/stores.example.csv` بصفين وهميين):

```bash
npx tsx scripts/xlsx-to-csv.ts JP_FOR_CLO.xlsx
```

المحوّل يوحّد الصفوف المكررة ويطبع أي تعارض بين نسختي نفس السوق حتى تراجعه بنفسك.
بعدها:

```bash
npm run seed -- --dry     # قراءة وفحص بدون كتابة
npm run seed              # كتابة stores و users في Supabase
```

### الاختبارات والبناء

```bash
npm test          # vitest
npm run build     # لازم يمر بدون أخطاء قبل أي push
```

## النشر على Cloudflare Pages

1. **Connect to Git** واختر هذا الريبو.
2. Framework preset: **Next.js**.
   Build command `npm run build` · Build output `.next`.
3. أضف متغيرات البيئة من `.env.example` في
   *Settings → Environment variables* (Production و Preview).
   `SUPABASE_SERVICE_ROLE_KEY` و مفاتيح R2 تكون **Secret** ولا تُنشر للمتصفح أبداً.
4. Node version: 20 أو أعلى (`NODE_VERSION=22`).
5. في R2: أنشئ الباكت، فعّل CORS لدومين الموقع، وحط الدومين العام في `R2_PUBLIC_URL`.
