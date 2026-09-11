/**
 * The employee app speaks two languages; the admin screens speak one.
 *
 * The choice belongs to the person holding the phone, not to their handset's
 * settings — a merchandiser handed a colleague's phone should not have to
 * change the device to read their own screen. So it is a button, and it is
 * kept in a cookie rather than in the browser's storage: the pages are
 * rendered on the server, and the server has to know which way the page reads
 * before it sends any HTML.
 *
 * The admin screens stay English whatever this says. What they produce is read
 * by Mars, so the word on the screen has to be the word in the file.
 */

export const LANGS = ["ar", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_COOKIE = "at_lang";
export const DEFAULT_LANG: Lang = "ar";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as readonly string[]).includes(value);
}

export function langOf(value: unknown): Lang {
  return isLang(value) ? value : DEFAULT_LANG;
}

export function dirOf(lang: Lang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

/** What the toggle offers next, so the button can name the other language. */
export function otherLang(lang: Lang): Lang {
  return lang === "ar" ? "en" : "ar";
}

export const LANG_NAME: Record<Lang, string> = {
  ar: "العربية",
  en: "English",
};

interface Strings {
  common: { yes: string; no: string; edit: string; none: string };
  login: {
    title: string;
    hint: string;
    placeholder: string;
    submit: string;
    busy: string;
    empty: string;
    failed: string;
    offline: string;
  };
  appBar: { signOut: string };
  stores: { title: string; count: string; empty: string; failed: string };
  entry: {
    activity: string;
    noActivities: string;
    planogram: string;
    planogramHint: string;
    size: string;
    question: string;
    answerYes: string;
    answerNo: string;
    answerOther: string;
    posmQuestion: string;
    photoLabel: string;
    entryDate: string;
    date: string;
    reasonQuestion: string;
    reasonDetail: string;
    reasonPlaceholder: string;
    staysOpen: string;
    altStore: string;
    altStorePlaceholder: string;
    review: string;
    confirmTitle: string;
    confirmHint: string;
    store: string;
    brands: string;
    entered: string;
    reason: string;
    actualStore: string;
    customPosm: string;
    photos: string;
    send: string;
    sending: string;
    uploading: string;
    back: string;
    doneTitle: string;
    again: string;
    saveFailed: string;
    offline: string;
    uploadOffline: string;
    uploadFailed: string;
  };
  photos: {
    choose: string;
    processFailed: string;
    max: string;
    needOne: string;
    needMany: (n: number) => string;
    extras: string;
    alt: (n: number) => string;
    remove: (n: number) => string;
  };
  setup: { title: string; body: string; hint: string };
}

const ar: Strings = {
  common: { yes: "نعم", no: "لا", edit: "تعديل", none: "—" },
  login: {
    title: "سجّل دخولك",
    hint: "اكتب رقمك الوظيفي.",
    placeholder: "الرقم الوظيفي",
    submit: "دخول",
    busy: "لحظة…",
    empty: "اكتب رقمك الوظيفي",
    failed: "تعذّر الدخول",
    offline: "تعذّر الاتصال، تأكد من الشبكة",
  },
  appBar: { signOut: "خروج" },
  stores: {
    title: "أسواقك",
    count: "سوق",
    empty: "ما فيه أسواق مربوطة بهذا الرقم.",
    failed: "تعذّر تحميل الأسواق. حاول مرة ثانية.",
  },
  entry: {
    activity: "الاكتفيتي",
    noActivities: "ما فيه اكتفيتي مضاف لهذا الشهر بعد.",
    planogram: "شوف البلانوغرام",
    planogramHint: "أشكال الاستاندات والأصناف اللي عليها",
    size: "المقاس",
    question: "هل تم إدخال الاستاند للسوق؟",
    answerYes: "نعم، دخل السوق",
    answerNo: "لا، ما دخل",
    answerOther: "دخل سوق آخر",
    posmQuestion: "هل تم تركيب مواد دعائية مخصصة؟",
    photoLabel: "صورة الاستاند",
    entryDate: "تاريخ الدخول",
    date: "التاريخ",
    reasonQuestion: "وش السبب؟",
    reasonDetail: "اكتب السبب",
    reasonPlaceholder: "وضّح وش صار",
    staysOpen: "السوق يبقى في قائمتك، وترجع تسجّل فيه لما يدخل الاستاند.",
    altStore: "اسم السوق الفعلي",
    altStorePlaceholder: "اكتب اسم السوق اللي دخله الاستاند",
    review: "مراجعة وإرسال",
    confirmTitle: "تأكيد المعلومات",
    confirmHint: "راجعها قبل الإرسال.",
    store: "السوق",
    brands: "البراندات",
    entered: "دخل الاستاند",
    reason: "السبب",
    actualStore: "السوق الفعلي",
    customPosm: "مواد دعائية مخصصة",
    photos: "الصور",
    send: "تأكيد وإرسال",
    sending: "جارٍ الإرسال…",
    uploading: "جارٍ رفع الصور",
    back: "رجوع لأسواقك",
    doneTitle: "تم الإرسال",
    again: "إدخال آخر لنفس السوق",
    saveFailed: "تعذّر الحفظ",
    offline: "تعذّر الاتصال، حاول مرة ثانية",
    uploadOffline: "تعذّر رفع الصور، تأكد من الشبكة وحاول مرة ثانية",
    uploadFailed: "تعذّر رفع الصور، حاول مرة ثانية",
  },
  photos: {
    choose: "اختر صورة",
    processFailed: "تعذّرت معالجة الصورة، جرّب مرة ثانية",
    max: "أقصى عدد صور",
    needOne: "مطلوب صورة واحدة على الأقل",
    needMany: (n) => `مطلوب ${n} صور على الأقل`,
    extras: "تقدر تضيف صور إضافية للجهة الأخرى — اختياري.",
    alt: (n) => `صورة ${n}`,
    remove: (n) => `حذف الصورة ${n}`,
  },
  setup: {
    title: "الإعداد غير مكتمل",
    body: "التطبيق منشور، لكن متغيرات البيئة التالية غير مضبوطة على الاستضافة:",
    hint: "أضفها في إعدادات الاستضافة ثم أعد النشر.",
  },
};

const en: Strings = {
  common: { yes: "Yes", no: "No", edit: "Edit", none: "—" },
  login: {
    title: "Sign in",
    hint: "Enter your employee number.",
    placeholder: "Employee number",
    submit: "Sign in",
    busy: "…",
    empty: "Enter your employee number",
    failed: "Could not sign in",
    offline: "Could not connect — check your signal",
  },
  appBar: { signOut: "Sign out" },
  stores: {
    title: "Your stores",
    count: "stores",
    empty: "No stores are linked to this number.",
    failed: "Could not load your stores. Try again.",
  },
  entry: {
    activity: "Activity",
    noActivities: "No activity has been added for this month yet.",
    planogram: "View the planogram",
    planogramHint: "The stands and the SKUs on them",
    size: "Size",
    question: "Did the stand go into the store?",
    answerYes: "Yes, it went in",
    answerNo: "No, it did not",
    answerOther: "It went into another store",
    posmQuestion: "Was custom POSM fitted?",
    photoLabel: "Photo of the stand",
    entryDate: "Date it went in",
    date: "Date",
    reasonQuestion: "Why not?",
    reasonDetail: "Say why",
    reasonPlaceholder: "Explain what happened",
    staysOpen: "The store stays on your list, and you can report again once the stand goes in.",
    altStore: "Actual store name",
    altStorePlaceholder: "Name the store the stand went into",
    review: "Review and send",
    confirmTitle: "Confirm the details",
    confirmHint: "Check them before sending.",
    store: "Store",
    brands: "Brands",
    entered: "Stand went in",
    reason: "Reason",
    actualStore: "Actual store",
    customPosm: "Custom POSM",
    photos: "Photos",
    send: "Confirm and send",
    sending: "Sending…",
    uploading: "Uploading photos",
    back: "Back to your stores",
    doneTitle: "Sent",
    again: "Another entry for the same store",
    saveFailed: "Could not save",
    offline: "Could not connect, try again",
    uploadOffline: "Could not upload the photos — check your signal and try again",
    uploadFailed: "Could not upload the photos, try again",
  },
  photos: {
    choose: "Choose a photo",
    processFailed: "Could not process that photo, try again",
    max: "Maximum photos",
    needOne: "At least one photo is required",
    needMany: (n) => `At least ${n} photos are required`,
    extras: "You can add more photos from other angles — optional.",
    alt: (n) => `Photo ${n}`,
    remove: (n) => `Remove photo ${n}`,
  },
  setup: {
    title: "Setup incomplete",
    body: "The app is deployed, but these environment variables are not set on the host:",
    hint: "Add them in the host's settings, then redeploy.",
  },
};

const DICT: Record<Lang, Strings> = { ar, en };

export function t(lang: Lang): Strings {
  return DICT[lang] ?? DICT[DEFAULT_LANG];
}
