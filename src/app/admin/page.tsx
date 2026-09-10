import { requireAdmin } from "@/lib/admin-guard";
import { missingEnv } from "@/lib/config";
import { serviceClient } from "@/lib/supabase";
import { SetupNeeded } from "@/components/SetupNeeded";
import { AdminTabs } from "@/components/AdminTabs";
import { tabOf, type TabKey } from "@/lib/admin-tabs";
import { ActivityManager, type ActivityRow } from "@/components/ActivityManager";
import { RouteUploader } from "@/components/RouteUploader";
import {
  HistoryTable,
  type HistoryRow,
  type StoreName,
} from "@/components/HistoryTable";
import { monthOf } from "@/lib/dates";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";
export const dynamic = "force-dynamic";

const HISTORY_SELECT =
  "id, month, store_id, emp_id, activity_name, brands, display_type, entered, entry_date," +
  " implementation_date, status, reason_code, alt_store_name, note," +
  " custom_posm, activity_id, submitted_at, approved";

/**
 * All three admin jobs behind one address.
 *
 * The tab is a URL parameter and each panel is rendered on the server, so only
 * the data for the open tab is fetched — a year of history is not loaded to
 * show the campaign list.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const missing = missingEnv();
  if (missing.length > 0) return <SetupNeeded missing={missing} />;

  const { tab: requestedTab, month: requestedMonth } = await searchParams;
  const tab = tabOf(requestedTab);
  await requireAdmin(`/admin?tab=${tab}`);

  const db = serviceClient();

  return (
    <main className="mx-auto max-w-[1500px] p-4">
      <AdminTabs active={tab} />
      {tab === "activities" && (
        <ActivitiesPanel db={db} month={requestedMonth?.trim() || monthOf(new Date())} />
      )}
      {tab === "route" && <RoutePanel db={db} />}
      {tab === "history" && <HistoryPanel db={db} month={requestedMonth?.trim() ?? ""} />}
    </main>
  );
}

type Db = ReturnType<typeof serviceClient>;

async function ActivitiesPanel({ db, month }: { db: Db; month: string }) {
  const { data } = await db
    .from("activities")
    .select("id, month, name, brands, image, active, sort_order")
    .eq("month", month)
    .order("sort_order")
    .order("name");

  return (
    <>
      <PanelHead title="الاكتفيتي" note="حملات الشهر والبراندات اللي تحملها.">
        <MonthPicker month={month} tab="activities" />
      </PanelHead>
      <ActivityManager month={month} initial={(data ?? []) as unknown as ActivityRow[]} />
    </>
  );
}

async function RoutePanel({ db }: { db: Db }) {
  const [stores, users] = await Promise.all([
    db.from("stores").select("id", { count: "exact", head: true }).eq("active", true),
    db.from("users").select("emp_id", { count: "exact", head: true }),
  ]);

  return (
    <>
      <PanelHead title="الروت" note="ارفع ملف الأسواق فيستبدل الروت بالكامل." />
      <RouteUploader storeCount={stores.count ?? 0} userCount={users.count ?? 0} />
    </>
  );
}

async function HistoryPanel({ db, month }: { db: Db; month: string }) {
  let query = db
    .from("submissions")
    .select(HISTORY_SELECT)
    .order("submitted_at", { ascending: false })
    .limit(2000);
  if (month) query = query.eq("month", month);

  const [rows, stores, allMonths] = await Promise.all([
    query,
    // Every store, including switched-off ones: history has to resolve a store
    // that has since closed.
    db.from("stores").select("id, name, account, city"),
    db.from("submissions").select("month").not("month", "is", null),
  ]);

  const months = [
    ...new Set(((allMonths.data ?? []) as { month: string }[]).map((r) => r.month)),
  ]
    .sort()
    .reverse();

  return (
    <>
      <PanelHead title="السجل" note="كل إدخال بكامل تفاصيله، جاهز للتصدير." />
      <HistoryTable
        rows={(rows.data ?? []) as unknown as HistoryRow[]}
        stores={(stores.data ?? []) as unknown as StoreName[]}
        months={months}
        month={month}
      />
    </>
  );
}

function PanelHead({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-[var(--mute)]">{note}</p>
      </div>
      {children && <div className="mr-auto">{children}</div>}
    </header>
  );
}

function MonthPicker({ month, tab }: { month: string; tab: TabKey }) {
  return (
    <form className="flex items-center gap-2 text-sm">
      <input type="hidden" name="tab" value={tab} />
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
  );
}
