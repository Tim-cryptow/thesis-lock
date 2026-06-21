// Calendar data for the contribution graph and monthly views. Reuses the
// activity log's proven Hiro fetch and Clarity argument decoding to read a
// wallet's anchoring transactions, then groups them by UTC date. A batch anchor
// expands into one entry per document, so the graph reflects documents anchored,
// not just transactions.

import { fetchActivityLog, type ActivityEvent } from "./activityLog";

export type CalendarHash = {
  hash: string;
  label: string;
  source: string;
  // Present for group anchors, so a verify link can address the exact group row.
  groupId?: number;
  groupIndex?: number;
};

export type CalendarDay = {
  // UTC calendar date, YYYY-MM-DD.
  date: string;
  count: number;
  hashes: CalendarHash[];
};

export type CalendarMonth = {
  year: number;
  // Zero-based month, matching JavaScript's Date (January = 0).
  month: number;
  days: CalendarDay[];
};

export type StreakInfo = {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  totalAnchors: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Newest-first paging guard. Most wallets resolve in a page or two; this caps a
// very active wallet so the calendar never pages forever.
const MAX_PAGES = 40;
const PAGE_SIZE = 50;

// The collected entries are cached briefly per address so switching views or
// navigating months does not refetch the whole transaction history each time.
const CACHE_TTL_MS = 60_000;

type AnchorEntry = {
  date: string;
  hash: string;
  label: string;
  source: string;
  groupId?: number;
  groupIndex?: number;
};

const entryCache = new Map<
  string,
  { at: number; promise: Promise<AnchorEntry[]> }
>();

// Maps an anchor-creating activity type to its source label. Batch anchors are
// handled separately (they carry many hashes). Registry registrations and proof
// mints are deliberately excluded: anchoring through the app submits a
// register-anchor for the same hash right after the single anchor, and a hash
// may later get a proof mint, so counting those follow-ups would inflate a day's
// count for what is really one anchored document.
const SOURCE_BY_TYPE: Partial<Record<ActivityEvent["type"], string>> = {
  anchor: "single",
  "group-anchor": "group",
};

// ---------------------------------------------------------------------------
// Block date estimate. Stacks produced roughly one block every ten minutes
// before the Nakamoto upgrade; anchored from a known height and date this gives
// a rough date for a block. It is an estimate only and is used solely as a
// fallback when a transaction carries no block time; the calendar otherwise uses
// the exact time Hiro returns.
// ---------------------------------------------------------------------------

const REF_BLOCK_HEIGHT = 100000;
const REF_BLOCK_DATE_MS = Date.UTC(2023, 0, 1);
const BLOCK_TIME_MS = 10 * 60 * 1000;

export function estimateBlockDate(blockHeight: number): string {
  const ms = REF_BLOCK_DATE_MS + (blockHeight - REF_BLOCK_HEIGHT) * BLOCK_TIME_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------

function utcDateKey(year: number, monthZero: number, day: number): string {
  const m = String(monthZero + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInYear(year: number): number {
  return isLeap(year) ? 366 : 365;
}

function daysInMonth(year: number, monthZero: number): number {
  return new Date(Date.UTC(year, monthZero + 1, 0)).getUTCDate();
}

// The UTC date an event falls on, from its block time, falling back to a block
// height estimate only when Hiro returned no time.
function eventDate(event: ActivityEvent): string {
  if (event.timestamp) return event.timestamp.slice(0, 10);
  if (event.blockHeight) return estimateBlockDate(event.blockHeight);
  return "";
}

// One entry per anchored document. A batch expands into its decoded entries; the
// group/member events that carry no hash yield nothing.
function entriesFromEvent(event: ActivityEvent): AnchorEntry[] {
  const date = eventDate(event);
  if (!date) return [];

  if (event.type === "batch-anchor") {
    const list = Array.isArray(event.details.entries)
      ? (event.details.entries as Array<{ hash?: unknown; label?: unknown }>)
      : [];
    return list
      .filter((e) => typeof e.hash === "string" && e.hash)
      .map((e) => ({
        date,
        hash: e.hash as string,
        label: typeof e.label === "string" ? e.label : "",
        source: "batch",
      }));
  }

  const source = SOURCE_BY_TYPE[event.type];
  if (!source) return [];
  const hash = typeof event.details.hash === "string" ? event.details.hash : null;
  if (!hash) return [];
  const label = typeof event.details.label === "string" ? event.details.label : "";
  const entry: AnchorEntry = { date, hash, label, source };
  if (event.type === "group-anchor") {
    if (typeof event.details.groupId === "number") {
      entry.groupId = event.details.groupId;
    }
    if (typeof event.details.index === "number") {
      entry.groupIndex = event.details.index;
    }
  }
  return [entry];
}

// Pages through the wallet's activity and flattens it into dated anchor entries,
// sharing one in-flight scan per address. Concurrent callers (for example the
// year grid and the monthly view on first load) then walk the Hiro history once
// rather than in parallel. A failed scan is evicted so a later call can retry.
function collectAnchorEntries(address: string): Promise<AnchorEntry[]> {
  const key = address.toUpperCase();
  const cached = entryCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.promise;
  const promise = scanAnchorEntries(address).catch((error) => {
    entryCache.delete(key);
    throw error;
  });
  entryCache.set(key, { at: Date.now(), promise });
  return promise;
}

async function scanAnchorEntries(address: string): Promise<AnchorEntry[]> {
  const entries: AnchorEntry[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let result;
    try {
      result = await fetchActivityLog(address, page, PAGE_SIZE);
    } catch {
      // Stop on a transient failure; return whatever was gathered so the view
      // degrades to partial data rather than nothing.
      break;
    }
    for (const event of result.events) entries.push(...entriesFromEvent(event));
    if (!result.hasMore) break;
  }

  // The batch contract's map-insert silently skips a {hash, owner} that already
  // exists, so a hash submitted twice in one batch, or re-submitted in a later
  // batch, is written on chain only once. Entries arrive newest first, so keep
  // the oldest occurrence of each batch hash (the one that actually wrote) and
  // drop the rest, to avoid inflating counts. A duplicate single anchor reverts
  // and is already filtered upstream, so only batch needs this.
  const seenBatch = new Set<string>();
  const deduped: AnchorEntry[] = [];
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry.source === "batch") {
      if (seenBatch.has(entry.hash)) continue;
      seenBatch.add(entry.hash);
    }
    deduped.push(entry);
  }

  return deduped;
}

function seedDay(map: Map<string, CalendarDay>, date: string): void {
  if (!map.has(date)) map.set(date, { date, count: 0, hashes: [] });
}

function applyEntries(map: Map<string, CalendarDay>, entries: AnchorEntry[]): void {
  for (const entry of entries) {
    const day = map.get(entry.date);
    if (!day) continue;
    day.hashes.push({
      hash: entry.hash,
      label: entry.label,
      source: entry.source,
      groupId: entry.groupId,
      groupIndex: entry.groupIndex,
    });
    day.count += 1;
  }
}

// A single month of days, each with its anchors. Defaults to the current UTC
// month. month is zero-based to match JavaScript's Date.
export async function buildCalendar(
  address: string,
  year: number = new Date().getUTCFullYear(),
  month: number = new Date().getUTCMonth(),
): Promise<CalendarMonth> {
  const entries = await collectAnchorEntries(address);
  const map = new Map<string, CalendarDay>();
  const total = daysInMonth(year, month);
  for (let day = 1; day <= total; day += 1) {
    seedDay(map, utcDateKey(year, month, day));
  }
  applyEntries(map, entries);
  return { year, month, days: Array.from(map.values()) };
}

// Every day of a year (365 or 366) with its anchor count, in chronological
// order, for the contribution graph.
export async function buildYearGrid(
  address: string,
  year: number = new Date().getUTCFullYear(),
): Promise<CalendarDay[]> {
  const entries = await collectAnchorEntries(address);
  const map = new Map<string, CalendarDay>();
  const start = Date.UTC(year, 0, 1);
  const total = daysInYear(year);
  for (let i = 0; i < total; i += 1) {
    seedDay(map, new Date(start + i * DAY_MS).toISOString().slice(0, 10));
  }
  applyEntries(map, entries);
  return Array.from(map.values());
}

// The most recent `days` days ending today (UTC), in chronological order. Spans
// a year boundary cleanly, for the compact graphs on the dashboard and profiles.
export async function buildRecentDays(
  address: string,
  days = 30,
): Promise<CalendarDay[]> {
  const entries = await collectAnchorEntries(address);
  const map = new Map<string, CalendarDay>();
  const now = new Date();
  const endUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = days - 1; i >= 0; i -= 1) {
    seedDay(map, new Date(endUtc - i * DAY_MS).toISOString().slice(0, 10));
  }
  applyEntries(map, entries);
  return Array.from(map.values());
}

// The set of UTC dates the wallet anchored on, over its full available history.
// Lets the current streak be computed independently of whatever bounded range a
// view happens to show.
export async function getActiveDates(address: string): Promise<Set<string>> {
  const entries = await collectAnchorEntries(address);
  return new Set(entries.map((e) => e.date));
}

// Consecutive-day streaks. Longest streak, active days, and total anchors are
// taken over the supplied days (the viewed range). The current streak counts
// back from today and uses the full history of active dates when provided, so a
// run that crosses the start of the range (a new year, or the mini graph's
// window) is not cut short; an inactive today is allowed once (the day is not
// over yet) so the streak is not reported broken before the user can anchor.
export function getStreakInfo(
  days: CalendarDay[],
  allActiveDates?: Set<string>,
): StreakInfo {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  let longestStreak = 0;
  let run = 0;
  let totalActiveDays = 0;
  let totalAnchors = 0;
  for (const day of sorted) {
    if (day.count > 0) {
      run += 1;
      totalActiveDays += 1;
      totalAnchors += day.count;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  // Anchored to today's real date, not the last day of the supplied range, so a
  // past year reports 0 rather than a stale run that merely ended on its
  // December 31. Uses the full active-date set when given so a streak is not cut
  // at the range boundary; otherwise falls back to the supplied range.
  const active =
    allActiveDates ??
    new Set(sorted.filter((d) => d.count > 0).map((d) => d.date));
  const now = new Date();
  let cursor = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // Today not being over yet does not break the streak: if today has no anchor,
  // start counting from yesterday.
  if (!active.has(new Date(cursor).toISOString().slice(0, 10))) {
    cursor -= DAY_MS;
  }
  let currentStreak = 0;
  while (active.has(new Date(cursor).toISOString().slice(0, 10))) {
    currentStreak += 1;
    cursor -= DAY_MS;
  }

  return { currentStreak, longestStreak, totalActiveDays, totalAnchors };
}
