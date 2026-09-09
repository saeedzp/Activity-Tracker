import { missingEnv } from "@/lib/config";
import { LoginForm } from "@/components/LoginForm";
import { SetupNeeded } from "@/components/SetupNeeded";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const missing = missingEnv();
  if (missing.length > 0) return <SetupNeeded missing={missing} />;
  return <LoginForm />;
}
