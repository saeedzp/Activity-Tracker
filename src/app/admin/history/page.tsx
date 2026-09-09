import { redirect } from "next/navigation";
import { currentSession } from "@/lib/session";
import { missingEnv } from "@/lib/config";
import { serviceClient } from "@/lib/supabase";
import { SetupNeeded } from "@/components/SetupNeeded";
import { AdminNav } from "@/components/AdminNav";
import {
  HistoryTable,
  type HistoryRow,
  type StoreName,
} from "@/components/HistoryTable";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";
export const dynamic = "force-dynamic";

const SELECT =
  "id, month, store_id, emp_id, brand, display_type, entered, entry_date," +
  " implementation_date, status, reason_code, alt_store_name, note," +
  " custom_posm, activity_id, submitted_at, approved";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const missing = missingEnv();
  if (missing.length > 0) return <SetupNeeded missing={missing} />;

  const session = await currentSession();
  if (!session) redirect("/");

  const { month: requested } = await searchParams;
  const month = requested?.trim() ?? "";

  const db = serviceClient();
  let query = db
    .from("submissions")
    .select(SELECT)
    .order("submitted_at", { ascending: false })
    .limit(2000);
  if (month) query = query.eq("month", month);

  const [rows, stores, allMonths] = await Promise.all([
    query,
    // Every store, including the switched-off ones: history has to resolve a
    // store that has since closed.
    db.from("stores").select("id, name, account, city"),
    db.from("submissions").select("month").not("month", "is", null),
  ]);

  const months = [
    ...new Set(((allMonths.data ?? []) as { month: string }[]).map((r) => r.month)),
  ]
    .sort()
    .reverse();

  return (
    <main className="mx-auto max-w-[1500px] p-4">
      <AdminNav />
      <h1 className="mb-1 text-xl font-bold">السجل</h1>
      <p className="mb-5 text-sm text-[var(--mute)]">
        كل إدخال بكامل تفاصيله، مرتّباً بالشهر — جاهز للتصدير لو طُلب التقرير.
      </p>
      <HistoryTable
        rows={(rows.data ?? []) as unknown as HistoryRow[]}
        stores={(stores.data ?? []) as unknown as StoreName[]}
        months={months}
        month={month}
      />
    </main>
  );
}
