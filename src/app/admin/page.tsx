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
  type PhotoRow,
  type StoreName,
} from "@/components/HistoryTable";
import { PhotoGallery } from "@/components/PhotoGallery";
import {
  PlanogramManager,
  type PlanogramRow,
  type ActivityOption as PlanogramActivity,
} from "@/components/PlanogramManager";
import type { ExportPhoto } from "@/lib/photo-export";
import { monthOf } from "@/lib/dates";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";
export const dynamic = "force-dynamic";

const HISTORY_SELECT =
  "id, month, store_id, emp_id, activity_name, brands, brand_categories," +
  " effective_from, effective_to, display_type, entered, entry_date," +
  " implementation_date, status, reason_code, alt_store_name, note," +
  " custom_posm, activity_id, submitted_at, approved";

/**
 * Every admin job behind one address.
 *
 * These screens are in English while the employee screens are in Arabic: what
 * the admin produces — the CSV, the photo folders — is read by Mars, so the
 * words on the screen are the words in the file.
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
  // The admin screens are English regardless of the employee's choice.
  if (missing.length > 0) return <SetupNeeded missing={missing} lang="en" />;

  const { tab: requestedTab, month: requestedMonth } = await searchParams;
  const tab = tabOf(requestedTab);
  await requireAdmin(`/admin?tab=${tab}`);

  const db = serviceClient();

  return (
    <main dir="ltr" className="mx-auto max-w-[1500px] p-4">
      <AdminTabs active={tab} />
      {tab === "activities" && (
        <ActivitiesPanel db={db} month={requestedMonth?.trim() || monthOf(new Date())} />
      )}
      {tab === "route" && <RoutePanel db={db} />}
      {tab === "planograms" && (
        <PlanogramsPanel db={db} month={requestedMonth?.trim() || monthOf(new Date())} />
      )}
      {tab === "history" && <HistoryPanel db={db} month={requestedMonth?.trim() ?? ""} />}
      {tab === "photos" && (
        <PhotosPanel db={db} month={requestedMonth?.trim() || monthOf(new Date())} />
      )}
    </main>
  );
}

type Db = ReturnType<typeof serviceClient>;

async function ActivitiesPanel({ db, month }: { db: Db; month: string }) {
  const { data } = await db
    .from("activities")
    .select("id, month, name, brands, brand_categories, effective_from, effective_to, image, active, sort_order")
    .eq("month", month)
    .order("sort_order")
    .order("name");

  return (
    <>
      <PanelHead title="Activities" note="This month's campaigns and the brands they carry.">
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
      <PanelHead title="Route" note="Upload the store file to replace the whole route." />
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

  const [rows, stores, allMonths, photos] = await Promise.all([
    query,
    // Every store, including switched-off ones: history has to resolve a store
    // that has since closed.
    db.from("stores").select("id, name, account, city, region, mars_code, retailer_no, customer_number"),
    db.from("submissions").select("month").not("month", "is", null),
    // Joined in the browser rather than per row: one query for the page beats
    // one per submission.
    db.from("photos").select("submission_id, r2_key").limit(8000),
  ]);

  const months = [
    ...new Set(((allMonths.data ?? []) as { month: string }[]).map((r) => r.month)),
  ]
    .sort()
    .reverse();

  return (
    <>
      <PanelHead title="History" note="Every submission in full, ready to export." />
      <HistoryTable
        rows={(rows.data ?? []) as unknown as HistoryRow[]}
        stores={(stores.data ?? []) as unknown as StoreName[]}
        photos={(photos.data ?? []) as unknown as PhotoRow[]}
        months={months}
        month={month}
      />
    </>
  );
}

/**
 * Planograms: this month's upload form, and every month's archive.
 *
 * The campaign list is the month on screen, because that is what a new
 * planogram can attach to. The planogram list is every month, because looking
 * one up is the whole point of keeping them — the names are resolved across
 * all campaigns so an old row still reads as something rather than an id.
 */
async function PlanogramsPanel({ db, month }: { db: Db; month: string }) {
  const [monthActivities, allActivities, planograms] = await Promise.all([
    db
      .from("activities")
      .select("id, name")
      .eq("month", month)
      .eq("active", true)
      .order("sort_order")
      .order("name"),
    db.from("activities").select("id, name"),
    db
      .from("planograms")
      .select("id, activity_id, month, title, r2_key, bytes, created_at")
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const names: Record<string, string> = {};
  for (const row of (allActivities.data ?? []) as unknown as { id: string; name: string }[]) {
    names[row.id] = row.name;
  }

  return (
    <>
      <PanelHead
        title="Planograms"
        note="The campaign’s drawing, for the employee to build against."
      >
        <MonthPicker month={month} tab="planograms" />
      </PanelHead>
      <PlanogramManager
        month={month}
        activities={(monthActivities.data ?? []) as unknown as PlanogramActivity[]}
        rows={(planograms.data ?? []) as unknown as PlanogramRow[]}
        activityNames={names}
      />
    </>
  );
}

/**
 * The month's photos, grouped for review and for download.
 *
 * Assembled here rather than in the browser: the photo row knows only its
 * submission, and it takes the store to say which region and city it belongs
 * to. Every store is read, switched-off ones included, so a store closed since
 * the photo was taken still lands in the right city.
 */
async function PhotosPanel({ db, month }: { db: Db; month: string }) {
  const [subs, stores] = await Promise.all([
    db.from("submissions").select("id, store_id, activity_name").eq("month", month),
    db.from("stores").select("id, name, region, city"),
  ]);

  const rows = (subs.data ?? []) as unknown as {
    id: string;
    store_id: string;
    activity_name: string | null;
  }[];

  const photos =
    rows.length === 0
      ? { data: [] }
      : await db
          .from("photos")
          .select("submission_id, r2_key")
          .in("submission_id", rows.map((r) => r.id))
          .limit(8000);

  const byId = new Map(rows.map((r) => [r.id, r]));
  const storeById = new Map(
    ((stores.data ?? []) as unknown as {
      id: string;
      name: string | null;
      region: string | null;
      city: string | null;
    }[]).map((s) => [s.id, s]),
  );

  const list: ExportPhoto[] = ((photos.data ?? []) as unknown as {
    submission_id: string;
    r2_key: string;
  }[]).map((photo) => {
    const submission = byId.get(photo.submission_id);
    const store = submission ? storeById.get(submission.store_id) : undefined;
    return {
      key: photo.r2_key,
      activityName: submission?.activity_name ?? null,
      region: store?.region ?? null,
      city: store?.city ?? null,
      storeName: store?.name ?? null,
    };
  });

  return (
    <>
      <PanelHead title="Photos" note="This month's photos by region, downloaded one region at a time.">
        <MonthPicker month={month} tab="photos" />
      </PanelHead>
      <PhotoGallery photos={list} month={month} />
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
      {children && <div className="ms-auto">{children}</div>}
    </header>
  );
}

function MonthPicker({ month, tab }: { month: string; tab: TabKey }) {
  return (
    <form className="flex items-center gap-2 text-sm">
      <input type="hidden" name="tab" value={tab} />
      <label htmlFor="month" className="text-[var(--mute)]">
        Month
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
        Show
      </button>
    </form>
  );
}
