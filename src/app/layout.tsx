import type { Metadata, Viewport } from "next";
import { DEFAULT_LANG, dirOf, LANG_COOKIE } from "@/lib/i18n";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";

export const metadata: Metadata = {
  title: "Activity Tracker",
  description: "متابعة تركيب الاستاندات في أسواق التجزئة",
  applicationName: "Activity Tracker",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Activity Tracker",
    // The bar sits on the app's ink header, so the status text has to be light.
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Matches the app bar, so the phone's chrome continues the header.
  themeColor: "#17150F",
};

/**
 * Reading the language cookie here would make every route dynamic, and the 404
 * has to stay static: Pages serves that file whenever the worker is not
 * running, which is how a missing compatibility flag gets diagnosed at all.
 *
 * So the layout ships the default, each page renders its own text and
 * direction from the cookie it reads itself, and this one line corrects the
 * document's own attributes before the first paint — early enough that nothing
 * is ever seen the wrong way round.
 */
const APPLY_LANG = `(function(){try{var m=document.cookie.match(/(?:^|; )${LANG_COOKIE}=(ar|en)/);var l=m?m[1]:"${DEFAULT_LANG}";var e=document.documentElement;e.lang=l;e.dir=l==="ar"?"rtl":"ltr";}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={DEFAULT_LANG} dir={dirOf(DEFAULT_LANG)}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPLY_LANG }} />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
