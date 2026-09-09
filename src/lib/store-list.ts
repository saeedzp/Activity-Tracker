/**
 * Which stores an employee sees, and how they are arranged.
 *
 * The two layouts differ deliberately: someone covering their own stores wants
 * a flat list they can work down, while someone overseeing many wants them
 * grouped and labelled with who is responsible.
 */

export interface StoreRow {
  id: string;
  name: string;
  account: string;
  city: string | null;
  region: string | null;
  me_id: string | null;
  me_name: string | null;
}

export interface StoreGroup {
  title: string;
  stores: StoreRow[];
}

/** Groups by city then account, both alphabetical, for a supervising view. */
export function groupStores(stores: StoreRow[]): StoreGroup[] {
  const groups = new Map<string, StoreRow[]>();
  for (const store of stores) {
    const title = `${store.city ?? "—"} · ${store.account}`;
    const bucket = groups.get(title);
    if (bucket) bucket.push(store);
    else groups.set(title, [store]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "ar"))
    .map(([title, rows]) => ({
      title,
      stores: rows.sort((a, b) => a.name.localeCompare(b.name, "ar")),
    }));
}
