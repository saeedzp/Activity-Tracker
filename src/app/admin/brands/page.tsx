import { redirect } from "next/navigation";
import { currentSession } from "@/lib/session";
import { missingEnv } from "@/lib/config";
import { serviceClient } from "@/lib/supabase";
import { SetupNeeded } from "@/components/SetupNeeded";
import { AdminNav } from "@/components/AdminNav";
import { BrandManager, type BrandRow } from "@/components/BrandManager";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const missing = missingEnv();
  if (missing.length > 0) return <SetupNeeded missing={missing} />;

  const session = await currentSession();
  if (!session) redirect("/");

  const db = serviceClient();
  const { data } = await db
    .from("brands")
    .select("id, name, image_url, color, active, sort_order")
    .order("sort_order")
    .order("name");

  return (
    <main className="mx-auto max-w-[1100px] p-4">
      <AdminNav />
      <h1 className="mb-4 text-xl font-bold">البراندات</h1>
      <BrandManager initial={(data ?? []) as unknown as BrandRow[]} />
    </main>
  );
}
