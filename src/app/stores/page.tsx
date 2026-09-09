import { redirect } from "next/navigation";
import { currentSession } from "@/lib/session";
import { missingEnv } from "@/lib/config";
import { serviceClient } from "@/lib/supabase";
import { SetupNeeded } from "@/components/SetupNeeded";
import { AppBar } from "@/components/AppBar";
import { groupStores, type StoreRow } from "@/lib/store-list";

// Cloudflare Pages runs every route on the edge runtime.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const missing = missingEnv();
  if (missing.length > 0) return <SetupNeeded missing={missing} />;

  const session = await currentSession();
  if (!session) redirect("/");

  const db = serviceClient();
  const { data, error } = await db
    .from("stores")
    .select("id, name, account, city, region, me_id, me_name")
    // Own stores for one column, the whole span for the other.
    .eq(session.role === "me" ? "me_id" : "tl_id", session.empId)
    // A store switched off in the route upload is gone from the list, but its
    // past submissions and the export still resolve it.
    .eq("active", true)
    .order("name");

  const stores = (data ?? []) as unknown as StoreRow[];
  const grouped = session.role === "tl";

  return (
    <>
      <AppBar name={session.name} />
      <main className="mx-auto max-w-[560px] p-4 pb-20">
        <h1 className="text-lg font-bold">أسواقك</h1>
        <p className="mb-4 text-sm text-[var(--mute)]">{stores.length} سوق</p>

        {error && (
          <div className="rounded-xl border border-[var(--warn)] bg-[var(--warn-soft)] p-4 text-sm text-[var(--warn)]">
            تعذّر تحميل الأسواق. حاول مرة ثانية.
          </div>
        )}

        {!error && stores.length === 0 && (
          <div className="rounded-xl border border-[var(--line)] bg-white p-6 text-center text-sm text-[var(--mute)]">
            ما فيه أسواق مربوطة بهذا الرقم.
          </div>
        )}

        {grouped
          ? groupStores(stores).map((group) => (
              <section key={group.title} className="mb-5">
                <div className="mb-2 flex items-baseline justify-between border-b border-[var(--line)] pb-1">
                  <h2 className="text-sm font-bold">{group.title}</h2>
                  <span className="text-xs text-[var(--mute)]">{group.stores.length}</span>
                </div>
                {group.stores.map((store) => (
                  <StoreCard key={store.id} store={store} showOwner />
                ))}
              </section>
            ))
          : stores.map((store) => <StoreCard key={store.id} store={store} />)}
      </main>
    </>
  );
}

function StoreCard({ store, showOwner }: { store: StoreRow; showOwner?: boolean }) {
  return (
    <a
      href={`/stores/${encodeURIComponent(store.id)}`}
      className="mb-2 block rounded-xl border border-[var(--line)] bg-white p-3.5"
    >
      <span className="block font-bold">{store.name}</span>
      <span className="block text-xs text-[var(--mute)]">
        {store.account}
        {showOwner && store.me_name ? ` · ${store.me_name}` : ""}
      </span>
    </a>
  );
}
