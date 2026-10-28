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
    posmQuestion: string;
    photoLabel: string;
    entryDate: string;
    date: string;
    reasonQuestion: string;
    staysOpen: string;
    review: string;
    confirmTitle: string;
    confirmHint: string;
    store: string;
    brands: string;
    entered: string;
    reason: string;
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
    side: (n: number) => string;
    optional: string;
  };
  setup: { title: string; body: string; hint: string };
  /**
   * What the routes answer with.
   *
   * The screens were translated and these were not, so an employee reading an
   * English app was refused in Arabic. The server reads the same cookie the
   * pages do and answers in the language the person chose.
   */
  api: {
    unauthorised: string;
    emptyEmpId: string;
    unknownEmpId: string;
    serverMisconfigured: string;
    connectFailed: string;
    missingFields: string;
    unknownStatus: string;
    wrongReasonForStatus: string;
    chooseReason: string;
    writeReason: string;
    nameAltStore: string;
    badPhoto: string;
    needPhoto: string;
    maxPhotos: (n: number) => string;
    activityMissing: string;
    saveFailed: string;
    photosNotConfigured: string;
    photoTooLarge: string;
    photoWrongType: string;
    photoUploadFailed: string;
    notFound: string;
  };
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
    question: "هل البلانوغرام مطبّق؟",
    answerYes: "نعم، مطبّق",
    answerNo: "لا، مو مطبّق",
    posmQuestion: "هل تم تركيب مواد دعائية مخصصة؟",
    photoLabel: "صور الاستاند (جهة لكل صورة)",
    entryDate: "تاريخ التطبيق",
    date: "التاريخ",
    reasonQuestion: "وش السبب؟",
    staysOpen: "السوق يبقى في قائمتك، وترجع تسجّل فيه لما يتطبّق البلانوغرام.",
    review: "مراجعة وإرسال",
    confirmTitle: "تأكيد المعلومات",
    confirmHint: "راجعها قبل الإرسال.",
    store: "السوق",
    brands: "البراندات",
    entered: "البلانوغرام مطبّق",
    reason: "السبب",
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
    extras: "صورة الجهة الثانية اختيارية.",
    alt: (n) => `صورة ${n}`,
    remove: (n) => `حذف الصورة ${n}`,
    side: (n) => (n === 1 ? "الجهة الأولى" : "الجهة الثانية"),
    optional: "اختياري",
  },
  api: {
    unauthorised: "غير مصرّح",
    emptyEmpId: "اكتب رقمك الوظيفي",
    unknownEmpId: "الرقم غير موجود",
    serverMisconfigured: "إعداد الخادم غير صحيح — راجع المسؤول",
    connectFailed: "تعذّر الاتصال، حاول مرة ثانية",
    missingFields: "بيانات ناقصة",
    unknownStatus: "حالة غير معروفة",
    wrongReasonForStatus: "كود السبب غير صحيح لهذه الحالة",
    chooseReason: "اختر السبب",
    writeReason: "اكتب السبب",
    nameAltStore: "اكتب اسم السوق الفعلي",
    badPhoto: "صورة غير صالحة",
    needPhoto: "أضف صورة واحدة على الأقل",
    maxPhotos: (n) => `أقصى عدد صور ${n}`,
    activityMissing: "الاكتفيتي غير موجود",
    saveFailed: "تعذّر الحفظ، حاول مرة ثانية",
    photosNotConfigured: "رفع الصور غير مهيأ",
    photoTooLarge: "الصورة كبيرة",
    photoWrongType: "صيغة غير مدعومة",
    photoUploadFailed: "تعذّر رفع الصورة",
    notFound: "غير موجود",
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
    question: "Is the planogram applied?",
    answerYes: "Yes, it is applied",
    answerNo: "No, it is not",
    posmQuestion: "Was custom POSM fitted?",
    photoLabel: "Stand photos (one per side)",
    entryDate: "Date applied",
    date: "Date",
    reasonQuestion: "Why not?",
    staysOpen: "The store stays on your list, and you can report again once the planogram is applied.",
    review: "Review and send",
    confirmTitle: "Confirm the details",
    confirmHint: "Check them before sending.",
    store: "Store",
    brands: "Brands",
    entered: "Planogram applied",
    reason: "Reason",
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
    extras: "The second side's photo is optional.",
    alt: (n) => `Photo ${n}`,
    remove: (n) => `Remove photo ${n}`,
    side: (n) => (n === 1 ? "Side 1" : "Side 2"),
    optional: "optional",
  },
  api: {
    unauthorised: "Not authorised",
    emptyEmpId: "Enter your employee number",
    unknownEmpId: "That number is not registered",
    serverMisconfigured: "The server is misconfigured — tell your admin",
    connectFailed: "Could not connect, try again",
    missingFields: "Something is missing",
    unknownStatus: "Unknown status",
    wrongReasonForStatus: "That reason code does not belong to this status",
    chooseReason: "Choose the reason",
    writeReason: "Say why",
    nameAltStore: "Name the actual store",
    badPhoto: "Invalid photo",
    needPhoto: "Add at least one photo",
    maxPhotos: (n) => `At most ${n} photos`,
    activityMissing: "Activity not found",
    saveFailed: "Could not save, try again",
    photosNotConfigured: "Photo upload is not set up",
    photoTooLarge: "The photo is too large",
    photoWrongType: "Unsupported format",
    photoUploadFailed: "Could not upload the photo",
    notFound: "Not found",
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
