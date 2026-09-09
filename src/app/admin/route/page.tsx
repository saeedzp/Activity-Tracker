import { redirect } from "next/navigation";
import { currentSession } from "@/lib/session";
import { missingEnv } from "@/lib/config";
import { serviceClient } from "@/lib/supabase";
import { SetupNeeded } from "@/components/SetupNeeded";
import { AdminNav } from "@/components/AdminNav";
import { RouteUploader } from "@/components/RouteUploader";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function RoutePage() {
  const missing = missingEnv();
  if (missing.length > 0) return <SetupNeeded missing={missing} />;

  const session = await currentSession();
  if (!session) redirect("/");

  const db = serviceClient();
  const [stores, users] = await Promise.all([
    db.from("stores").select("id", { count: "exact", head: true }).eq("active", true),
    db.from("users").select("emp_id", { count: "exact", head: true }),
  ]);

  return (
    <main className="mx-auto max-w-[900px] p-4">
      <AdminNav />
      <h1 className="mb-1 text-xl font-bold">الروت</h1>
      <p className="mb-5 text-sm text-[var(--mute)]">
        ارفع ملف الأسواق، وشوف وش راح يتغيّر قبل الحفظ.
      </p>
      <RouteUploader storeCount={stores.count ?? 0} userCount={users.count ?? 0} />
    </main>
  );
}
