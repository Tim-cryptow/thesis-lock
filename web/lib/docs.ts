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
];

export const REPO_URL = "https://github.com/Tim-cryptow/thesis-lock";

/** Link to a repo file's source on the default branch. */
export function editUrl(repoPath: string): string {
  return `${REPO_URL}/blob/main/${repoPath}`;
}

export function getDoc(slug: string): DocMeta | undefined {
  return DOCS.find((doc) => doc.slug === slug);
}
