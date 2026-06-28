// Command palette catalog and fuzzy matching. The palette (Ctrl+K) lets power
// users jump to any page or run a common action without reaching for the mouse.
//
// Items are plain data so they can be filtered and ranked here and rendered by
// the modal. Page items carry a `path`; action items are identified by `id` and
// run by the modal, which has access to the router, theme, and tour.

import { FAQS } from "./help";

export type PaletteSection = "recent" | "pages" | "actions" | "help";

export type PaletteItem = {
  id: string;
  title: string;
  description: string;
  // Icon key resolved to an SVG by the modal's icon map.
  icon: string;
  // Destination route for page items. Absent for actions.
  path?: string;
  // Optional handler for action items run outside the router.
  action?: () => void;
  // Keyboard shortcut hint, shown right-aligned on the row.
  shortcut?: string;
  section: PaletteSection;
};

// Dispatched (by the keyboard handler) to toggle the palette open.
export const PALETTE_OPEN_EVENT = "thesislock:open-palette";
// Dispatched by the "Open shortcuts help" action; the keyboard shortcuts
// component listens for it and opens its modal.
export const SHORTCUTS_OPEN_EVENT = "thesislock:open-shortcuts";

// sessionStorage key and cap for the Recent section.
const RECENT_KEY = "thesislock_recent";
const RECENT_MAX = 5;

// Every navigable page, in a sensible default order.
const PAGES: PaletteItem[] = [
  {
    id: "anchor",
    title: "Anchor",
    description: "/anchor",
    icon: "anchor",
    path: "/anchor",
    shortcut: "N",
    section: "pages",
  },
  {
    id: "anchors",
    title: "My Anchors",
    description: "/anchors",
    icon: "history",
    path: "/anchors",
    shortcut: "H",
    section: "pages",
  },
  {
    id: "verify",
    title: "Verify",
    description: "Verify a document by hash, wallet, or label",
    icon: "shield",
    path: "/search",
    section: "pages",
  },
  {
    id: "search",
    title: "Search",
    description: "/search",
    icon: "search",
    path: "/search",
    section: "pages",
  },
  {
    id: "feed",
    title: "Feed",
    description: "/feed",
    icon: "feed",
    path: "/feed",
    section: "pages",
  },
  {
    id: "stats",
    title: "Stats",
    description: "/stats",
    icon: "chart",
    path: "/stats",
    section: "pages",
  },
  {
    id: "explorer",
    title: "Contract Explorer",
    description: "/explorer",
    icon: "code",
    path: "/explorer",
    section: "pages",
  },
  {
    id: "watchlist",
    title: "Watchlist",
    description: "/watchlist",
    icon: "shield",
    path: "/watchlist",
    section: "pages",
  },
  {
    id: "collections",
    title: "Collections",
    description: "/collections",
    icon: "group",
    path: "/collections",
    section: "pages",
  },
  {
    id: "groups",
    title: "Groups",
    description: "/groups",
    icon: "group",
    path: "/groups",
    shortcut: "G",
    section: "pages",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "/dashboard",
    icon: "chart",
    path: "/dashboard",
    section: "pages",
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "/calendar",
    icon: "calendar",
    path: "/calendar",
    section: "pages",
  },
  {
    id: "activity",
    title: "Activity",
    description: "/activity",
    icon: "activity",
    path: "/activity",
    section: "pages",
  },
  {
    id: "compare",
    title: "Compare",
    description: "/compare",
    icon: "compare",
    path: "/compare",
    section: "pages",
  },
  {
    id: "report",
    title: "Report",
    description: "/report",
    icon: "doc",
    path: "/report",
    section: "pages",
  },
  {
    id: "verify-bulk",
    title: "Bulk Verify",
    description: "/verify-bulk",
    icon: "shield",
    path: "/verify-bulk",
    section: "pages",
  },
  {
    id: "templates",
    title: "Templates",
    description: "/templates",
    icon: "doc",
    path: "/templates",
    section: "pages",
  },
  {
    id: "developers",
    title: "Developers",
    description: "/developers",
    icon: "code",
    path: "/developers",
    section: "pages",
  },
  {
    id: "docs",
    title: "Docs",
    description: "/docs",
    icon: "doc",
    path: "/docs",
    shortcut: "D",
    section: "pages",
  },
  {
    id: "help",
    title: "Help",
    description: "/help",
    icon: "help",
    path: "/help",
    section: "pages",
  },
  {
    id: "embed",
    title: "Embed",
    description: "/embed",
    icon: "code",
    path: "/embed",
    section: "pages",
  },
];

// Common actions. These are run by the modal (which has the router, theme, and
// tour in scope) by switching on their id, so they carry no live handler here.
const ACTIONS: PaletteItem[] = [
  {
    id: "new-anchor",
    title: "Create new anchor",
    description: "Anchor a new document",
    icon: "anchor",
    shortcut: "N",
    section: "actions",
  },
  {
    id: "new-group",
    title: "Create new group",
    description: "Start a shared anchor group",
    icon: "group",
    section: "actions",
  },
  {
    id: "export-anchors",
    title: "Export my anchors",
    description: "Open your anchor history to export",
    icon: "history",
    section: "actions",
  },
  {
    id: "generate-report",
    title: "Generate report",
    description: "Build a verification report",
    icon: "doc",
    section: "actions",
  },
  {
    id: "toggle-theme",
    title: "Toggle theme",
    description: "Switch light, dark, or system",
    icon: "theme",
    shortcut: ".",
    section: "actions",
  },
  {
    id: "start-tour",
    title: "Start tour",
    description: "Take the guided walkthrough",
    icon: "tour",
    section: "actions",
  },
  {
    id: "open-shortcuts",
    title: "Open shortcuts help",
    description: "Show all keyboard shortcuts",
    icon: "help",
    shortcut: "?",
    section: "actions",
  },
  {
    id: "whats-new",
    title: "What's new",
    description: "See the latest release highlights",
    icon: "doc",
    section: "actions",
  },
];

// All navigable pages plus the common actions.
export function getAllItems(): PaletteItem[] {
  return [...PAGES, ...ACTIONS];
}

// FAQ topics, surfaced in the palette only while searching so the default list
// stays short. Selecting one opens the FAQ with that question expanded.
const HELP: PaletteItem[] = FAQS.map((faq) => ({
  id: `faq-${faq.slug}`,
  title: faq.question,
  description: `FAQ: ${faq.category}`,
  icon: "help",
  path: `/help/faq#${faq.slug}`,
  section: "help",
}));

export function getHelpItems(): PaletteItem[] {
  return HELP;
}

// Appends a visited path to the front of the recent list (deduped, capped).
export function recordVisit(path: string): void {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentVisits().filter((p) => p !== path);
    recent.unshift(path);
    window.sessionStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, RECENT_MAX)));
  } catch {
    // Non-fatal if sessionStorage is unavailable.
  }
}

// Returns up to the last five visited paths, most recent first.
export function getRecentVisits(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === "string").slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

// Resolves a previously visited path back to its page item for the Recent
// section, returning the first matching page (paths are not always unique).
export function pageItemForPath(path: string): PaletteItem | undefined {
  return PAGES.find((p) => p.path === path);
}

// Subsequence fuzzy score: every character of the query must appear in order in
// the text. Contiguous runs and a leading match score higher; returns null when
// the query is not a subsequence at all.
function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 0;
  let qi = 0;
  let score = 0;
  let prev = -2;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += prev === ti - 1 ? 3 : 1;
      if (ti === 0) score += 2;
      prev = ti;
      qi++;
    }
  }
  return qi === q.length ? score : null;
}

// Filters and ranks items by a fuzzy match against title and description. An
// empty query returns the items unchanged.
export function filterItems(query: string, items: PaletteItem[]): PaletteItem[] {
  const q = query.trim();
  if (!q) return items;
  const scored: { item: PaletteItem; score: number }[] = [];
  for (const item of items) {
    const titleScore = fuzzyScore(q, item.title);
    const descScore = fuzzyScore(q, item.description);
    const best =
      titleScore === null
        ? descScore
        : descScore === null
          ? titleScore
          : Math.max(titleScore, descScore);
    if (best !== null) scored.push({ item, score: best });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}
