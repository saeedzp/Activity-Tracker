/**
 * Seed `stores` and `users` from seed/stores.csv.
 *
 *   npm run seed             -- writes to Supabase
 *   npm run seed -- --dry    -- parse and report only, no writes
 *
 * The real CSV holds employee names and IDs and is gitignored.
 * seed/stores.example.csv shows the expected columns.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { parseCsvRecords } from "../src/lib/csv";
import { normalizeAccount, normalizeRegion } from "../src/lib/match";
import { serviceClient } from "../src/lib/supabase";

const CSV_PATH = process.env.SEED_CSV ?? path.join(process.cwd(), "seed", "stores.csv");
const DRY = process.argv.includes("--dry");

interface StoreRow {
  id: string;
  name: string;
  account: string;
  city: string | null;
  region: string | null;
  mars_code: string | null;
  retailer_no: string | null;
  me_id: string | null;
  me_name: string | null;
  tl_id: string | null;
  tl_name: string | null;
}

interface UserRow {
  emp_id: string;
  name: string;
  role: "me" | "tl";
  active: boolean;
}

/** Keep a store number only when it is a non-zero integer; otherwise drop it. */
function usableNumber(value: string): string | null {
  const raw = value.trim();
  if (!/^\d+$/.test(raw)) return null;
  return Number(raw) === 0 ? null : String(Number(raw));
}

function pick(rec: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const v = rec[key];
    if (v !== undefined && v.trim() !== "") return v.trim();
  }
  return "";
}

export function buildRows(records: Record<string, string>[]): {
  stores: StoreRow[];
  users: UserRow[];
  skipped: number;
} {
  const stores: StoreRow[] = [];
  const users = new Map<string, UserRow>();
  let skipped = 0;

  for (const rec of records) {
    const id = pick(rec, "STORE ID", "Store ID", "store_id");
    if (!id) {
      skipped++;
      continue;
    }

    stores.push({
      id,
      name: pick(rec, "Store Name", "MARS Store") || id,
      // Accounts are unified on the way in, so matching never has to guess later.
      account: normalizeAccount(pick(rec, "Account Name", "Account Code")),
      city: pick(rec, "City") || null,
      region: normalizeRegion(pick(rec, "Region")) || null,
      mars_code: usableNumber(pick(rec, "MARS Code")),
      // Kept only when it is a real number: the source has 0 and stray text here.
      retailer_no: usableNumber(pick(rec, "Retailer NO.", "Retailer No")),
      me_id: pick(rec, "ME (1) ID", "ME ID") || null,
      me_name: pick(rec, "ME (1) Name", "ME Name") || null,
      tl_id: pick(rec, "TL ID") || null,
      tl_name: pick(rec, "TL Name") || null,
    });

    const meId = pick(rec, "ME (1) ID", "ME ID");
    if (meId && !users.has(meId)) {
      users.set(meId, {
        emp_id: meId,
        name: pick(rec, "ME (1) Name", "ME Name") || meId,
        role: "me",
        active: true,
      });
    }
    const tlId = pick(rec, "TL ID");
    if (tlId && !users.has(tlId)) {
      users.set(tlId, {
        emp_id: tlId,
        name: pick(rec, "TL Name") || tlId,
        role: "tl",
        active: true,
      });
    }
  }

  return { stores, users: [...users.values()], skipped };
}

async function main() {
  let csv: string;
  try {
    csv = readFileSync(CSV_PATH, "utf8");
  } catch {
    console.error(`Cannot read ${CSV_PATH}`);
    console.error("Place the real stores.csv there (it stays out of git), or set SEED_CSV.");
    process.exit(1);
  }

  const { stores, users, skipped } = buildRows(parseCsvRecords(csv));
  console.log(`Parsed ${stores.length} stores, ${users.length} users (${skipped} rows skipped).`);

  if (DRY) {
    console.log("Dry run — nothing written.");
    return;
  }

  const db = serviceClient();

  // Users first: stores reference them by name only, but submissions need the FK.
  for (let i = 0; i < users.length; i += 500) {
    const chunk = users.slice(i, i + 500);
    const { error } = await db.from("users").upsert(chunk, { onConflict: "emp_id" });
    if (error) throw new Error(`users upsert failed: ${error.message}`);
  }
  console.log(`Upserted ${users.length} users.`);

  for (let i = 0; i < stores.length; i += 500) {
    const chunk = stores.slice(i, i + 500);
    const { error } = await db.from("stores").upsert(chunk, { onConflict: "id" });
    if (error) throw new Error(`stores upsert failed: ${error.message}`);
  }
  console.log(`Upserted ${stores.length} stores.`);
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
