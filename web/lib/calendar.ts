// Calendar data for the contribution graph and monthly views. Reuses the
// activity log's proven Hiro fetch and Clarity argument decoding to read a
// wallet's anchoring transactions, then groups them by UTC date. A batch anchor
// expands into one entry per document, so the graph reflects documents anchored,
// not just transactions.

import { fetchActivityLog, type ActivityEvent } from "./activityLog";

export type CalendarHash = { hash: string; label: string; source: string };

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

type AnchorEntry = { date: string; hash: string; label: string; source: string };

const entryCache = new Map<string, { at: number; entries: AnchorEntry[] }>();

// Maps a single-hash activity type to the source label shown on the badge. Batch
// anchors are handled separately because they carry many hashes.
const SOURCE_BY_TYPE: Partial<Record<ActivityEvent["type"], string>> = {
  anchor: "single",
  register: "registry",
  "group-anchor": "group",
  "mint-proof": "proof",
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
  return [{ date, hash, label, source }];
}

// Pages through the wallet's activity and flattens it into dated anchor entries,
// caching the result per address for a short window.
async function collectAnchorEntries(address: string): Promise<AnchorEntry[]> {
  const key = address.toUpperCase();
  const cached = entryCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.entries;

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

  entryCache.set(key, { at: Date.now(), entries });
  return entries;
}

function seedDay(map: Map<string, CalendarDay>, date: string): void {
  if (!map.has(date)) map.set(date, { date, count: 0, hashes: [] });
}

function applyEntries(map: Map<string, CalendarDay>, entries: AnchorEntry[]): void {
  for (const entry of entries) {
    const day = map.get(entry.date);
    if (!day) continue;
    day.hashes.push({ hash: entry.hash, label: entry.label, source: entry.source });
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

// Consecutive-day streaks over the given days. The current streak counts back
// from today; an inactive today is allowed once (the day is not over yet) so a
// streak is not reported broken before the user has a chance to anchor.
export function getStreakInfo(days: CalendarDay[]): StreakInfo {
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

  const todayKey = new Date().toISOString().slice(0, 10);
  let currentStreak = 0;
  let graceUsed = false;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const day = sorted[i];
    if (day.date > todayKey) continue; // ignore future days
    if (day.count > 0) {
      currentStreak += 1;
    } else if (!graceUsed && day.date === todayKey) {
      graceUsed = true; // today is not over yet
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak, totalActiveDays, totalAnchors };
}
