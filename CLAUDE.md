# Activity Tracker — قواعد المشروع الثابتة

هذه القواعد لا تتغيّر. أي كود يخالفها يُعتبر خطأ.

## اللغة

- **التخزين والتصدير بالإنجليزي دائماً**: الحالات، أكواد الأسباب، أنواع الاستاند،
  وكل ما يذهب إلى قاعدة البيانات أو ملف التصدير.
- **العرض بالعربي**: الترجمات في `src/lib/domain.ts` (`STATUS_AR`, `REASON_AR`)
  وهي للعرض فقط. لا تخزّن نصاً عربياً في أي عمود.
- الواجهة RTL بالكامل، mobile-first.
- **لا تذكر في الواجهة كلمة «مرچندايزر» أو «تيم ليدر» إطلاقاً.** شاشة الدخول
  فيها حقل الرقم الوظيفي فقط.

## الحالات وأكواد الأسباب — ثابتة، لا تُخترع غيرها

```
Implemented                  → Low Stock | POSM not received | Without POSM        [يقفل]
Implemented in another store → بدون كود سبب، مع اسم السوق الفعلي (alt_store_name)   [يقفل]
Not Implemented              → Account Restriction | Contract Issue | OOS | Space Issue
                               | POSM not received | Stand not received | Stand Damaged
                               | Stand Missing | Store Refused | Store renovation
                               | Store Temporarily Closed | Store Permanently Closed
                               | Other                                             [يبقى مفتوح]
```

مصدر الحقيقة الوحيد: `src/lib/domain.ts`، ومطبَّق أيضاً كـ CHECK constraint في
`supabase/migrations/0001_init.sql`.

## القاعدة الحرجة — الإقفال

السطر يقفل **فقط** عند `Implemented` أو `Implemented in another store`.
أي حالة أخرى تبقى مفتوحة ويرجع الاكتفيتي لقائمة الموظف.
استعمل `isClosing()` — لا تكرر الشرط يدوياً في أي مكان.

## أنواع الاستاند

`50X50 · 1x1 · 2x1 · 2x2 · 3x2 · 6x2 · GE · GMU · Rebrandable`

## submissions سجل أحداث

`submissions` **append-only**: كل تحديث سطر جديد، ولا نعدّل القديم أبداً.
آخر سطر لكل `(store_id, brand, display_type)` هو الحالة الحالية (`current_state` view).

## الوقت

`submitted_at` من السيرفر دائماً — لا تثق بساعة الجوال، ولا تعرض القيمة للموظف.

## المطابقة

`src/lib/match.ts` — أربع مراحل بالترتيب الصارم:
`store_aliases` ← رقم السوق + الأكاونت (بشرط ألا يكون صفراً أو فاضياً) ←
اسم تقريبي داخل نفس الأكاونت بعتبة `0.62` ← `unlinked`.
أي نتيجة أقل من `0.80` تُعلَّم «مطابقة ضعيفة» للمراجعة.

توحيد إجباري قبل أي مقارنة:
`PANDA/Panda/panda → panda` · `BD/Bindawood/Bin Dawood → bin dawood` ·
`Tier 3 → other mt` · قص المسافات الزائدة · `Madinah → West`.

## التصدير

نفس أعمدة مارس الـ20 بالترتيب. عند `Implemented in another store` يُكتب اسم السوق
الفعلي في `Additional Comments`.

## الأمان والـ Git

- لا تكتب أي مفتاح حقيقي في أي ملف داخل الريبو. المفاتيح في `.env.local` فقط.
- لا ترفع ملفات فيها أسماء موظفين أو أرقامهم. `seed/stores.csv` يبقى محلياً؛
  المرفوع هو `seed/stores.example.csv`.
- قبل أي push: `npm run build` و `npm test` بدون أخطاء.
- رسائل الـ commit بصيغة Conventional Commits.
