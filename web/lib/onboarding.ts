// Onboarding tour: step definitions and the small amount of persistent state
// that decides whether a first-time visitor sees the guided walkthrough.
//
// A step either points at a real element (via a CSS selector in `target`, by
// convention a `[data-tour="..."]` attribute) or, when `target` is empty, is
// rendered as a centered modal. When a step lives on another route, `page` holds
// the path the overlay should navigate to before showing it.

export type TourStep = {
  id: string;
  // CSS selector for the highlighted element. Empty string renders a centered
  // modal with no spotlight (used for the welcome and closing steps).
  target: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
  // Optional hint shown on the primary button (for example "Anchor a file").
  action?: string;
  // Route this step belongs to. When set and the visitor is elsewhere, the
  // overlay offers a "Go to ..." button that navigates and resumes.
  page?: string;
};

// The full 17-step sequence. Selectors target `data-tour` attributes added to
// the relevant elements; steps whose target is absent on the current page fall
// back to a centered tooltip so the tour never dead-ends.
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    target: "",
    title: "Welcome to ThesisLock",
    content:
      "ThesisLock anchors a fingerprint of your document on the Stacks blockchain, giving you permanent, verifiable proof it existed at a point in time. Your file never leaves this device. This quick tour shows you around.",
    position: "bottom",
    page: "/",
  },
  {
    id: "anchor-nav",
    target: '[data-tour="anchor-nav"]',
    title: "Start by anchoring a document",
    content:
      "Anchoring records a SHA-256 hash of your file on chain with an optional label. This is where most journeys begin.",
    position: "bottom",
    action: "Anchor a document",
    page: "/anchor",
  },
  {
    id: "drop-zone",
    target: '[data-tour="drop-zone"]',
    title: "Drop any file here",
    content:
      "Drag a file in or click to browse. The file is hashed locally in your browser, so the document itself is never uploaded.",
    position: "bottom",
    page: "/anchor",
  },
  {
    id: "label-input",
    target: '[data-tour="label-input"]',
    title: "Add a label for easy identification",
    content:
      "An optional ASCII label up to 64 characters travels on chain with the anchor, so you can recognize it later in your history and on verification pages.",
    position: "top",
    page: "/anchor",
  },
  {
    id: "template-selector",
    target: '[data-tour="template-selector"]',
    title: "Choose a template for structured labels",
    content:
      "Templates turn a label into structured fields for papers, legal documents, code releases, datasets, and certificates, with a live preview as you type.",
    position: "top",
    page: "/anchor",
  },
  {
    id: "batch-tab",
    target: '[data-tour="batch-tab"]',
    title: "Anchor up to 10 files at once",
    content:
      "Switch to the batch tab to anchor up to ten files in a single transaction, sharing one on-chain record and one signature.",
    position: "bottom",
    page: "/anchor",
  },
  {
    id: "anchors-nav",
    target: '[data-tour="anchors-nav"]',
    title: "View your anchor history",
    content:
      "My Anchors lists everything your connected wallet has anchored, populated automatically as you anchor, with export and certificate options.",
    position: "bottom",
    page: "/anchor",
  },
  {
    id: "search-nav",
    target: '[data-tour="search-nav"]',
    title: "Search by hash, wallet, or label",
    content:
      "Search runs across every contract, so you can look up an anchor by its hash, the wallet that created it, or the label it carries.",
    position: "bottom",
    page: "/anchor",
  },
  {
    id: "groups-nav",
    target: '[data-tour="groups-nav"]',
    title: "Organize anchors by team",
    content:
      "Groups let a team create a named, shared on-chain history and anchor documents together under one roster.",
    position: "bottom",
    page: "/anchor",
  },
  {
    id: "stats-nav",
    target: '[data-tour="stats-nav"]',
    title: "See protocol-wide statistics",
    content:
      "Stats shows aggregate activity across the whole protocol: totals, recent growth, and the most active wallets.",
    position: "bottom",
    page: "/anchor",
  },
  {
    id: "dashboard-nav",
    target: '[data-tour="dashboard-nav"]',
    title: "Your personal analytics",
    content:
      "The Dashboard turns your own anchoring activity into charts and summaries, scoped to your connected wallet.",
    position: "bottom",
    page: "/anchor",
  },
  {
    id: "watchlist-nav",
    target: '[data-tour="watchlist-nav"]',
    title: "Monitor what matters to you",
    content:
      "Add document hashes, wallets, and groups to your watchlist to track when a hash gets anchored or a wallet or group gains new anchors. New updates show as a badge right here.",
    position: "bottom",
    page: "/anchor",
  },
  {
    id: "collections-nav",
    target: '[data-tour="collections-nav"]',
    title: "Organize anchors into collections",
    content:
      "Collections are browser-local folders for the anchors you care about, like playlists for your proofs. Group documents, add notes, and share a collection as a link or import one someone sent you.",
    position: "bottom",
    page: "/anchor",
  },
  {
    id: "calendar-nav",
    target: '[data-tour="calendar-nav"]',
    title: "Track your anchoring streak",
    content:
      "The calendar maps your anchoring activity to dates as a contribution graph, with a monthly view and a streak counter so you can see your patterns and keep your momentum.",
    position: "top",
    page: "/anchor",
  },
  {
    id: "notifications-nav",
    target: '[data-tour="notifications-nav"]',
    title: "Your notification center",
    content:
      "The bell gathers transaction confirmations, watchlist updates, new protocol anchors, and group activity in one place. Open it for recent items, or visit the notifications page to filter and set preferences.",
    position: "left",
    page: "/anchor",
  },
  {
    id: "theme-toggle",
    target: '[data-tour="theme-toggle"]',
    title: "Switch between light and dark",
    content:
      "Cycle between light, dark, and system themes at any time. Your choice is remembered on this device.",
    position: "left",
  },
  {
    id: "shortcuts-help",
    target: '[data-tour="shortcuts-help"]',
    title: "Press ? for keyboard shortcuts",
    content:
      "Power users can move fast with keyboard shortcuts. Press ? anywhere to see the full list, or Ctrl+K to open the command palette.",
    position: "left",
  },
  {
    id: "developers-link",
    target: '[data-tour="developers-link"]',
    title: "Explore the API playground and SDK",
    content:
      "The developer portal has a live API playground, scoped API keys, and copy-ready integration guides for the SDK, CLI, and CI pipelines.",
    position: "top",
  },
  {
    id: "finish",
    target: "",
    title: "You're ready!",
    content:
      "That's the tour. Anchor your first document to create a permanent, verifiable timestamp. You can restart this tour any time from the footer.",
    position: "bottom",
    action: "Anchor your first document",
    page: "/anchor",
  },
];

// localStorage key recording that the visitor has seen (or dismissed) the tour.
const TOUR_COMPLETE_KEY = "thesislock_tour_complete";

// True when the tour should auto-start: a browser with storage available and no
// completion flag set. Any access error (private mode, disabled storage) is
// treated as "already seen" so we never nag a visitor we cannot remember.
export function shouldShowTour(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TOUR_COMPLETE_KEY) !== "1";
  } catch {
    return false;
  }
}

// Marks the tour as finished so it does not auto-start again.
export function completeTour(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOUR_COMPLETE_KEY, "1");
  } catch {
    // Non-fatal if localStorage is unavailable.
  }
}

// Clears the completion flag so the tour can be taken again.
export function resetTour(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOUR_COMPLETE_KEY);
  } catch {
    // Non-fatal if localStorage is unavailable.
  }
}
