import { redirect } from "next/navigation";
import { currentSession } from "@/lib/session";
import { missingEnv } from "@/lib/config";
import { SetupNeeded } from "@/components/SetupNeeded";
import { AdminNav } from "@/components/AdminNav";
import { serviceClient } from "@/lib/supabase";
import { ActivityGrid } from "@/components/ActivityGrid";
import type { ActivityDraft } from "@/lib/grid";
import { ACTIVITY_GRID_SELECT, toDraft, type ActivityRow } from "@/lib/activity-row";
import type { StoreOption } from "@/components/StorePicker";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";

export const dynamic = "force-dynamic";

/** Default to the current month, which is what the operator is planning. */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  // Checked before the session, which needs SESSION_SECRET to even be read.
  const missing = missingEnv();
  if (missing.length > 0) return <SetupNeeded missing={missing} />;

  const session = await currentSession();
  if (!session) redirect("/");

  const { month: requested } = await searchParams;
  const month = requested?.trim() || currentMonth();

  let rows: ActivityDraft[] = [];
  let stores: StoreOption[] = [];
  let loadError = "";

  try {
    const db = serviceClient();
    const [activities, storeRows] = await Promise.all([
      db
        .from("activities")
        .select(ACTIVITY_GRID_SELECT)
        .eq("month", month)
        .order("created_at"),
      db.from("stores").select("id, name, account, city").order("name"),
    ]);

    if (activities.error) throw new Error(activities.error.message);
    stores = (storeRows.data ?? []) as StoreOption[];
    rows = ((activities.data ?? []) as unknown as ActivityRow[]).map((a) =>
      toDraft(a, month),
    );
  } catch (error) {
    loadError = error instanceof Error ? error.message : "تعذّر تحميل البيانات";
  }

  return (
    <main className="mx-auto max-w-[1400px] p-4">
      <AdminNav />
      <header className="mb-4 flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-bold">جدول الاكتفيتي</h1>
        <form className="flex items-center gap-2 text-sm">
          <label htmlFor="month" className="text-[var(--mute)]">
            الفترة
          </label>
          <input
            id="month"
            name="month"
            type="month"
            defaultValue={month}
            className="rounded-lg border border-[var(--line)] bg-white px-2 py-1"
          />
          <button type="submit" className="rounded-lg border border-[var(--line)] bg-white px-3 py-1 font-bold">
            عرض
          </button>
        </form>
      </header>

      {loadError ? (
        <div className="rounded-xl border border-[var(--warn)] bg-[var(--warn-soft)] p-4 text-sm text-[var(--warn)]">
          <b className="block">تعذّر الاتصال بقاعدة البيانات</b>
          <span className="mt-1 block font-mono text-xs">{loadError}</span>
        </div>
      ) : (
        <ActivityGrid month={month} initialRows={rows} stores={stores} />
      )}
    </main>
  );
}
