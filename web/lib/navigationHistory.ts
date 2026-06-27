// A lightweight, per-session record of the pages a user has visited, used by
// the back button and the recent-pages dropdown for wayfinding. Stored in
// sessionStorage so it clears when the tab closes and never leaves the device.

export type RecentPage = {
  path: string;
  title: string;
  visitedAt: string;
};

const STORAGE_KEY = "thesislock.navHistory";
const MAX_ENTRIES = 20;

function isRecentPage(value: unknown): value is RecentPage {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.path === "string" &&
    typeof entry.title === "string" &&
    typeof entry.visitedAt === "string"
  );
}

function read(): RecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentPage);
  } catch {
    return [];
  }
}

// Record a visit, newest first. A repeat visit to the same path moves it back
// to the top rather than piling up, and the list is capped at MAX_ENTRIES.
export function recordPageVisit(path: string, title: string): void {
  if (typeof window === "undefined" || !path) return;
  try {
    const pages = read().filter((page) => page.path !== path);
    pages.unshift({ path, title, visitedAt: new Date().toISOString() });
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pages.slice(0, MAX_ENTRIES)));
  } catch {
    // sessionStorage can be unavailable or full; wayfinding is best-effort.
  }
}

export function getRecentPages(): RecentPage[] {
  return read();
}

// The most recent visited page that is not the current one, so the back button
// points somewhere meaningful regardless of whether the current page has been
// recorded yet.
export function getPreviousPage(): { path: string; title: string } | null {
  const pages = read();
  const current = typeof window !== "undefined" ? window.location.pathname : null;
  const previous = pages.find((page) => page.path !== current);
  return previous ? { path: previous.path, title: previous.title } : null;
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to recover from; the list simply stays as it was.
  }
}
