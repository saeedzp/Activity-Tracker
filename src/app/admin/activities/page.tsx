import { redirect } from "next/navigation";
import { currentSession } from "@/lib/session";
import { missingEnv } from "@/lib/config";
import { serviceClient } from "@/lib/supabase";
import { SetupNeeded } from "@/components/SetupNeeded";
import { AdminNav } from "@/components/AdminNav";
import { ActivityManager, type ActivityRow } from "@/components/ActivityManager";
import { monthOf } from "@/lib/dates";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const missing = missingEnv();
  if (missing.length > 0) return <SetupNeeded missing={missing} />;

  const session = await currentSession();
  if (!session) redirect("/");

  const { month: requested } = await searchParams;
  const month = requested?.trim() || monthOf(new Date());

  const db = serviceClient();
  const { data } = await db
    .from("activities")
    .select("id, month, name, brands, active, sort_order")
    .eq("month", month)
    .order("sort_order")
    .order("name");

  return (
    <main className="mx-auto max-w-[1100px] p-4">
      <AdminNav />
      <header className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-bold">الاكتفيتي</h1>
          <p className="text-sm text-[var(--mute)]">حملات الشهر والبراندات اللي تحملها.</p>
        </div>
        <form className="mr-auto flex items-center gap-2 text-sm">
          <label htmlFor="month" className="text-[var(--mute)]">
            الشهر
          </label>
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={month}
            className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5"
          />
          <button
            type="submit"
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 font-bold"
          >
            عرض
          </button>
        </form>
      </header>

      <ActivityManager month={month} initial={(data ?? []) as unknown as ActivityRow[]} />
    </main>
  );
}
