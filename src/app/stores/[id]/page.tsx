import { redirect } from "next/navigation";
import { currentSession } from "@/lib/session";
import { missingEnv } from "@/lib/config";
import { serviceClient } from "@/lib/supabase";
import { SetupNeeded } from "@/components/SetupNeeded";
import { AppBar } from "@/components/AppBar";
import { EntryForm, type ActivityOption } from "@/components/EntryForm";
import { monthOf } from "@/lib/dates";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function StoreEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const missing = missingEnv();
  if (missing.length > 0) return <SetupNeeded missing={missing} />;

  const session = await currentSession();
  if (!session) redirect("/");

  const { id } = await params;
  const db = serviceClient();
  const [storeResult, activityResult] = await Promise.all([
    db
      .from("stores")
      .select("id, name, account, city, me_id, tl_id")
      .eq("id", id)
      .eq("active", true)
      .maybeSingle(),
    // This month's campaigns: what the employee is reporting against.
    db
      .from("activities")
      .select("id, name, brands, image")
      .eq("month", monthOf(new Date()))
      .eq("active", true)
      .order("sort_order")
      .order("name"),
  ]);
  const { data } = storeResult;
  const activities = (activityResult.data ?? []) as unknown as ActivityOption[];

  // Scoped to the signed-in employee, so a guessed store id reveals nothing.
  const store = data as { id: string; name: string; me_id: string; tl_id: string } | null;
  const mine =
    store &&
    (session.role === "me" ? store.me_id === session.empId : store.tl_id === session.empId);
  if (!mine) redirect("/stores");

  return (
    <>
      <AppBar name={session.name} />
      <main className="mx-auto max-w-[560px] p-4">
        <EntryForm storeId={store.id} storeName={store.name} activities={activities} />
      </main>
    </>
  );
}
