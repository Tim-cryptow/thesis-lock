export type DocMeta = {
  slug: string;
  title: string;
  description: string;
};

// Ordered navigation for the documentation site. Drives both the sidebar and
// the docs landing page, so a new page only needs an entry here plus its route.
export const DOCS: DocMeta[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description:
      "What ThesisLock is, how anchoring works, and how to anchor your first document in under a minute.",
  },
  {
    slug: "getting-started-tour",
    title: "Getting Started Tour",
    description:
      "The interactive onboarding tour that walks first-time visitors through anchoring, history, search, groups, stats, and more, and how to restart it any time.",
  },
  {
    slug: "command-palette",
    title: "Command Palette",
    description:
      "Open the command palette with Ctrl+K (Cmd+K on macOS) to jump to any page or run a common action with fuzzy search and the keyboard.",
  },
  {
    slug: "navigation",
    title: "Navigation",
    description:
      "Find your way around with breadcrumb trails, a context-aware back button, and a recently visited pages menu.",
  },
  {
    slug: "empty-states",
    title: "Empty States",
    description:
      "What you see when a page has no data yet: a clear explanation of what belongs there and a button toward the next step.",
  },
  {
    slug: "confirmation-dialogs",
    title: "Confirmation Dialogs",
    description:
      "How destructive and irreversible actions ask first, the danger, warning, and info variants, and the useConfirm hook.",
  },
  {
    slug: "animations",
    title: "Animations",
    description:
      "The fade-in, staggered list, and count-up animations, the micro-interactions, and how they respect reduced motion.",
  },
  {
    slug: "favorites",
    title: "Favorites",
    description:
      "Star hashes, wallets, groups, and pages for quick access from the favorites bar and the favorites page.",
  },
  {
    slug: "hash-matching",
    title: "Hash Matching",
    description:
      "File previews with thumbnails, and the hash matcher that confirms a file matches an anchored hash for integrity checks.",
  },
  {
    slug: "input-validation",
    title: "Input Validation",
    description:
      "How fields validate hashes, addresses, labels, and names with clear errors, character counters, auto-formatting, and matching API checks.",
  },
  {
    slug: "error-handling",
    title: "Error Handling",
    description:
      "How missing routes, invalid parameters, runtime errors, rate limits, and offline use each get a consistent, helpful page that guides you back.",
  },
  {
    slug: "contracts",
    title: "Contracts",
    description:
      "The five Clarity contracts, their mainnet addresses, function signatures, and direct Hiro API calls.",
  },
  {
    slug: "explorer",
    title: "Contract Explorer",
    description:
      "Browse all five contracts inside the app: functions grouped by access, maps and data variables, recent on-chain calls, an architecture diagram, and an interactive read-only function tester.",
  },
  {
    slug: "web-app",
    title: "Web App Guide",
    description:
      "Anchoring single files and batches, using groups, verifying, bulk checks, history export, and certificates.",
  },
  {
    slug: "templates",
    title: "Anchor Templates",
    description:
      "Structured label formats for papers, legal documents, code releases, datasets, and certificates, plus the label encoding.",
  },
  {
    slug: "activity",
    title: "Activity Log",
    description:
      "A unified per-wallet timeline of every contract interaction, with category filters and infinite scroll.",
  },
  {
    slug: "live-updates",
    title: "Live Updates",
    description:
      "How the real-time event ticker and auto-updating feed, stats, and explorer work, what they poll, and how to pause or resume live updates.",
  },
  {
    slug: "notifications",
    title: "Notifications",
    description:
      "The unified notification center: how transaction, watchlist, protocol, and group events are aggregated, plus browser push, sound alerts, and per-type preferences.",
  },
  {
    slug: "watchlist",
    title: "Watchlist",
    description:
      "Save document hashes, wallets, and groups you want to monitor, then track their on-chain status and new anchors in one place, with update badges across the app.",
  },
  {
    slug: "collections",
    title: "Collections",
    description:
      "Organize anchored documents into named, browser-local collections. Create folders, add anchors by hash, file, or from your wallet, then share a collection as a link or import one someone sent you.",
  },
  {
    slug: "tags",
    title: "Tags",
    description:
      "Add flexible tags to any anchor and filter by tag across history, feed, and search. Auto-suggestions from templates, a tag cloud, usage stats, and rename, merge, recolor, and delete, all stored in your browser.",
  },
  {
    slug: "wallet-profiles",
    title: "Wallet Profiles",
    description:
      "Public per-wallet profile pages with anchoring stats, recent anchors, document types, a JSON API, and an embeddable badge.",
  },
  {
    slug: "compare",
    title: "Anchor Comparison",
    description:
      "Compare two anchored documents side by side: which was anchored first, the estimated time gap, and how their owner, label, source, and metadata differ, with shareable comparison links.",
  },
  {
    slug: "api",
    title: "API Reference",
    description:
      "The JSON REST API for verification, search, stats, badges, cards, and health.",
  },
  {
    slug: "sdk",
    title: "SDK Guide",
    description:
      "Install the TypeScript SDK, create a client, and call every verification and lookup method.",
  },
  {
    slug: "cli",
    title: "CLI Guide",
    description:
      "Verify, hash, search, and check status from the terminal or a CI pipeline.",
  },
  {
    slug: "github-action",
    title: "GitHub Action",
    description:
      "Gate any CI pipeline on a document being anchored on Stacks, with inputs, outputs, and example workflows.",
  },
  {
    slug: "reports",
    title: "Verification Reports",
    description:
      "Generate formal, multi-document verification reports proving a set of hashes were anchored on Stacks, exportable as HTML, JSON, or CSV.",
  },
  {
    slug: "api-keys",
    title: "API Keys",
    description:
      "Create and manage scoped API keys in the developer portal, how they are stored, and what they are for.",
  },
  {
    slug: "integration-guides",
    title: "Integration Guides",
    description:
      "Copy-ready examples for verifying anchors from JavaScript, Python, cURL, GitHub Actions, and any CI/CD pipeline.",
  },
  {
    slug: "performance",
    title: "Performance Monitoring",
    description:
      "In-browser Web Vitals, page load, and API response metrics with a local dashboard and a debug overlay, for spotting bottlenecks without any external analytics.",
  },
  {
    slug: "audit",
    title: "Audit Trail",
    description:
      "A tamper-evident, browser-local record of every action, with SHA-256 integrity verification, filtering, and exportable JSON, CSV, and printable HTML compliance reports for academic and legal chain-of-custody.",
  },
  {
    slug: "status",
    title: "System Status",
    description:
      "The public status page: live health of all five contracts, the API endpoints, and the Hiro and Stacks dependencies, with response times, 24-hour uptime, incident tracking, a JSON API, and an embeddable status badge.",
  },
  {
    slug: "calendar",
    title: "Calendar",
    description:
      "Your anchoring activity as a GitHub-style contribution graph and a monthly calendar, with current and longest streaks, per-day anchor detail, and report generation for any day.",
  },
  {
    slug: "feeds",
    title: "Feeds",
    description:
      "Subscribe to protocol events in any reader: RSS 2.0, Atom 1.0, and JSON Feed endpoints, filterable by contract and wallet, with autodiscovery built in.",
  },
  {
    slug: "webhooks",
    title: "Webhooks",
    description:
      "Subscribe to protocol events programmatically: the event types, the signed JSON payload format, HMAC-SHA256 signature verification, and the developer portal manager and tester.",
  },
  {
    slug: "data-portability",
    title: "Data Portability",
    description:
      "Back up everything ThesisLock stores in your browser to one JSON file, restore it on another device with merge or replace, review storage usage, clear data, and control privacy and preferences from the settings page.",
  },
  {
    slug: "sharing",
    title: "Sharing",
    description:
      "Share verification results, profiles, groups, and protocol stats on X, LinkedIn, and Telegram, copy links, and let people scan an in-browser QR code to verify on mobile.",
  },
  {
    slug: "loading-states",
    title: "Loading States",
    description:
      "How ThesisLock shows skeleton loaders shaped like each page's final layout while data loads, with a theme-aware shimmer that respects reduced-motion.",
  },
  {
    slug: "changelog",
    title: "Changelog",
    description:
      "Notable changes and improvements to ThesisLock, including the standardized copy interactions, truncated hash and address components, and the global clipboard toast.",
  },
];

export const REPO_URL = "https://github.com/Tim-cryptow/thesis-lock";

/** Link to a repo file's source on the default branch. */
export function editUrl(repoPath: string): string {
  return `${REPO_URL}/blob/main/${repoPath}`;
}

export function getDoc(slug: string): DocMeta | undefined {
  return DOCS.find((doc) => doc.slug === slug);
}
