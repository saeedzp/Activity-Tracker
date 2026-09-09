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

## النشر على Cloudflare

المشروع فيه API routes وصفحات server-side، فما ينشر كموقع ثابت.
يستعمل محوّل `@opennextjs/cloudflare` اللي يحوّل مخرجات Next إلى Worker.

**لا تستعمل** `.next` كمجلد مخرجات — ما راح يشتغل.

### الإعداد في لوحة Cloudflare

Workers & Pages → **Create → Workers → Import a repository** واختر هذا الريبو، ثم:

| الحقل | القيمة |
|---|---|
| Build command | `npm run cf:build` |
| Deploy command | `npx wrangler deploy` |
| Build output directory | `.open-next` |

الإعدادات الباقية في `wrangler.jsonc` داخل الريبو، ومنها `nodejs_compat`
وهو **إجباري** لأن توقيع كوكي الجلسة يستعمل `node:crypto`.

### متغيرات البيئة

في إعدادات المشروع → **Variables and Secrets** أضف كل المتغيرات من
`.env.example` لبيئتي Production و Preview.

`SUPABASE_SERVICE_ROLE_KEY` و `SESSION_SECRET` ومفاتيح R2 تُضاف نوع
**Secret** لا Text — وإلا تظهر بالعادي في اللوحة وفي السجلات.

### تجربة النشر محلياً قبل الرفع

```bash
npm run preview     # يبني ويشغّل الـ Worker محلياً، نفس بيئة Cloudflare
npm run deploy      # نشر مباشر من جهازك
```

`npm run dev` يشغّل Next العادي وهو أسرع للتطوير، لكنه **لا يكشف** أخطاء
تظهر فقط في بيئة الـ Worker. جرّب `npm run preview` قبل أي نشر.

### R2 للصور

أنشئ الباكت، فعّل CORS لدومين الموقع، وحط الدومين العام في `R2_PUBLIC_URL`.
