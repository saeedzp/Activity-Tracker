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

المشروع فيه API routes وصفحات server-side، ويُنشر عبر `@cloudflare/next-on-pages`
اللي يحوّل مخرجات Next إلى Pages Functions.

### الإعداد في لوحة Cloudflare

Workers & Pages → **Create → Pages → Connect to Git** واختر هذا الريبو:

| الحقل | القيمة |
|---|---|
| Framework preset | Next.js |
| Build command | `npm run cf:build` |
| Build output directory | `.vercel/output/static` |

ثم **Settings → Functions → Compatibility flags** أضف `nodejs_compat`
لبيئتي Production و Preview. بدونها الموقع يبني وينهار وقت التشغيل.

### متغيرات البيئة

**Settings → Environment variables** لبيئتي Production و Preview:

| المتغير | ملاحظة |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** |
| `SESSION_SECRET` | **Secret** — ولّده بالأمر تحت |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | |
| مفاتيح `R2_*` | **Secret** — للصور لاحقاً |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### تأكد إن النشر سليم

افتح `/api/health` بعد النشر. الرد يقول أي متغير ناقص وهل القاعدة ترد،
بدون ما يكشف أي قيمة سرية. المتوقع:

```json
{ "ok": true, "missing": [], "database": { "reachable": true, "stores": 287, "users": 91 } }
```

### قيود لازم تعرفها

Pages يشغّل كل شي على **edge runtime**، فـ:

- كل route و page فيها `export const runtime = "edge"`.
- ممنوع `node:` APIs في كود السيرفر — نستعمل `crypto.subtle` بدل `node:crypto`.
- `next` مثبّت على `15.5.2` بالضبط، لأن `next-on-pages` لا يدعم أحدث منها.

### تجربة محلية بنفس بيئة Pages

```bash
npm run preview     # يبني ويشغّل الموقع محلياً كـ Pages Function
npm run deploy      # نشر مباشر من جهازك
```

`npm run dev` أسرع للتطوير لكنه **لا يكشف** أخطاء تظهر فقط في بيئة edge.
جرّب `npm run preview` قبل أي نشر.

### R2 للصور

أنشئ الباكت، فعّل CORS لدومين الموقع، وحط الدومين العام في `R2_PUBLIC_URL`.
