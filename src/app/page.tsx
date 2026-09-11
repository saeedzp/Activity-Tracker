import { missingEnv } from "@/lib/config";
import { currentLang } from "@/lib/lang-server";
import { LoginForm } from "@/components/LoginForm";
import { SetupNeeded } from "@/components/SetupNeeded";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const missing = missingEnv();
  const lang = await currentLang();
  if (missing.length > 0) return <SetupNeeded missing={missing} lang={lang} />;
  return <LoginForm lang={lang} />;
}
