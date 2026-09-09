/**
 * Store matching engine.
 *
 * Maps a raw Mars activity row (store number + store name + account) onto a
 * store in our own `stores` table. Runs in strict stage order — the first
 * stage that produces a hit wins.
 *
 *   1. store_aliases  — a link a human confirmed before. Always highest priority.
 *   2. store number + account — only when the number is neither empty nor zero.
 *   3. fuzzy name match inside the same account, threshold 0.62.
 *   4. otherwise `unlinked`, surfaced on the linking screen.
 */

import type { MatchMethod } from "./domain";

export const FUZZY_THRESHOLD = 0.62;
/** Below this a fuzzy hit is still accepted but flagged for human review. */
export const WEAK_MATCH_THRESHOLD = 0.8;

/** Generic words that carry no identifying signal for a Saudi retail store. */
export const STOP_WORDS = [
  "othaim",
  "panda",
  "danube",
  "bin",
  "dawood",
  "lulu",
  "al",
  "the",
  "hyper",
  "hypermarket",
  "market",
  "center",
  "mall",
  "branch",
  "br",
  "store",
] as const;

export interface StoreRecord {
  id: string;
  name: string;
  account: string;
  city?: string | null;
  region?: string | null;
  retailer_no?: string | null;
}

export interface StoreAlias {
  mars_store_no: string;
  mars_store_name: string;
  account: string;
  store_id: string;
}

export interface MarsRow {
  mars_store_no: string | number | null | undefined;
  mars_store_name: string | null | undefined;
  account: string | null | undefined;
}

export interface MatchCandidate {
  store: StoreRecord;
  score: number;
}

export interface MatchResult {
  store_id: string | null;
  match_method: MatchMethod;
  match_score: number;
  /** True when a fuzzy hit landed under WEAK_MATCH_THRESHOLD. */
  weak: boolean;
  /** Up to 3 nearest stores, for the manual linking screen. */
  suggestions: MatchCandidate[];
}

/* ------------------------------------------------------------ normalization */

/** Collapse whitespace, strip punctuation, lowercase. Applied before anything else. */
export function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Mandatory account unification. Mars files spell the same account many ways;
 * every comparison happens on the unified form.
 */
export function normalizeAccount(value: unknown): string {
  const t = normalizeText(value);
  if (!t) return "";
  if (/\bpanda\b/.test(t)) return "panda";
  if (/^bd$/.test(t) || /\bbin\s*dawood\b/.test(t) || /\bbindawood\b/.test(t)) {
    return "bin dawood";
  }
  if (/\btier\s*3\b/.test(t)) return "other mt";
  return t;
}

/** `Madinah` is reported as its own region by Mars but belongs to West for us. */
export function normalizeRegion(value: unknown): string {
  const t = normalizeText(value);
  if (!t) return "";
  if (t === "madinah" || t === "al madinah" || t === "medina") return "west";
  return t;
}

/** A store number of "", "0", "0000" or non-numeric junk must never match. */
export function isUsableStoreNo(value: unknown): boolean {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  if (!/^\d+$/.test(raw)) return false;
  return Number(raw) !== 0;
}

export function normalizeStoreNo(value: unknown): string {
  const raw = String(value ?? "").trim();
  return /^\d+$/.test(raw) ? String(Number(raw)) : raw;
}

/** Tokenize a store name and drop the generic words before comparing. */
export function nameTokens(value: unknown): string[] {
  const stop = new Set<string>(STOP_WORDS);
  return normalizeText(value)
    .split(" ")
    .filter((t) => t.length > 0 && !stop.has(t));
}

/* ---------------------------------------------------------------- similarity */

function bigrams(token: string): string[] {
  if (token.length < 2) return [token];
  const out: string[] = [];
  for (let i = 0; i < token.length - 1; i++) out.push(token.slice(i, i + 2));
  return out;
}

/** Dice coefficient over character bigrams. */
function diceCoefficient(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aGrams = bigrams(a);
  const bGrams = new Map<string, number>();
  for (const g of bigrams(b)) bGrams.set(g, (bGrams.get(g) ?? 0) + 1);
  let hits = 0;
  for (const g of aGrams) {
    const left = bGrams.get(g) ?? 0;
    if (left > 0) {
      bGrams.set(g, left - 1);
      hits++;
    }
  }
  return (2 * hits) / (aGrams.length + bigrams(b).length);
}

/**
 * Similarity between two store names, on the significant tokens only.
 * Each token of the shorter side is paired with its best partner on the other,
 * so word order and extra branch words do not sink an otherwise clear match.
 */
export function nameSimilarity(a: unknown, b: unknown): number {
  const left = nameTokens(a);
  const right = nameTokens(b);
  if (left.length === 0 || right.length === 0) {
    // Nothing significant on one side — fall back to the whole normalized string.
    return diceCoefficient(normalizeText(a), normalizeText(b));
  }
  const [short, long] =
    left.length <= right.length ? [left, right] : [right, left];
  let total = 0;
  for (const token of short) {
    let best = 0;
    for (const other of long) {
      const s = diceCoefficient(token, other);
      if (s > best) best = s;
    }
    total += best;
  }
  const base = total / short.length;
  // Penalize when one name carries many more significant words than the other.
  const coverage = short.length / long.length;
  return base * (0.75 + 0.25 * coverage);
}

/* -------------------------------------------------------------- the pipeline */

export function rankCandidates(
  row: MarsRow,
  stores: StoreRecord[],
  limit = 3,
): MatchCandidate[] {
  const account = normalizeAccount(row.account);
  const pool = account
    ? stores.filter((s) => normalizeAccount(s.account) === account)
    : stores;
  const scored = (pool.length > 0 ? pool : stores).map((store) => ({
    store,
    score: nameSimilarity(row.mars_store_name, store.name),
  }));
  scored.sort((a, b) => b.score - a.score || a.store.id.localeCompare(b.store.id));
  return scored.slice(0, limit);
}

export function matchStore(
  row: MarsRow,
  stores: StoreRecord[],
  aliases: StoreAlias[] = [],
): MatchResult {
  const account = normalizeAccount(row.account);
  const storeNo = normalizeStoreNo(row.mars_store_no);
  const nameKey = normalizeText(row.mars_store_name);
  const suggestions = rankCandidates(row, stores);

  // Stage 1 — a saved link always wins.
  const alias = aliases.find((a) => {
    if (normalizeAccount(a.account) !== account) return false;
    const byNo =
      isUsableStoreNo(a.mars_store_no) &&
      isUsableStoreNo(storeNo) &&
      normalizeStoreNo(a.mars_store_no) === storeNo;
    const byName =
      nameKey.length > 0 && normalizeText(a.mars_store_name) === nameKey;
    return byNo || byName;
  });
  if (alias) {
    return {
      store_id: alias.store_id,
      match_method: "manual",
      match_score: 1,
      weak: false,
      suggestions,
    };
  }

  // Stage 2 — store number + account, but only for a real number.
  if (isUsableStoreNo(storeNo) && account) {
    const hit = stores.find(
      (s) =>
        normalizeAccount(s.account) === account &&
        isUsableStoreNo(s.retailer_no) &&
        normalizeStoreNo(s.retailer_no) === storeNo,
    );
    if (hit) {
      return {
        store_id: hit.id,
        match_method: "exact",
        match_score: 1,
        weak: false,
        suggestions,
      };
    }
  }

  // Stage 3 — fuzzy name inside the same account.
  const best = suggestions[0];
  if (best && best.score >= FUZZY_THRESHOLD) {
    return {
      store_id: best.store.id,
      match_method: "fuzzy",
      match_score: Number(best.score.toFixed(4)),
      weak: best.score < WEAK_MATCH_THRESHOLD,
      suggestions,
    };
  }

  // Stage 4 — hand it to the linking screen.
  return {
    store_id: null,
    match_method: "unlinked",
    match_score: best ? Number(best.score.toFixed(4)) : 0,
    weak: false,
    suggestions,
  };
}
