// Version metadata and the user-facing release history. This is the single
// source of truth for the app version: the changelog page, the what's-new modal,
// the version badge, and the version, health, and status API routes all read
// from here. APP_VERSION should match RELEASES[0].version.

export const APP_VERSION = "1.6.0";

export type ChangeType = "feat" | "fix" | "docs" | "chore" | "test";

export type ChangeEntry = {
  type: ChangeType;
  description: string;
};

export type Release = {
  version: string;
  // Release date as an ISO calendar date (YYYY-MM-DD).
  date: string;
  title: string;
  highlights: string[];
  changes: ChangeEntry[];
};

// Newest first. The first entry is the current release.
export const RELEASES: Release[] = [
  {
    version: "1.6.0",
    date: "2026-06-28",
    title: "Help center, security hardening, and code quality",
    highlights: [
      "In-app help center with a searchable FAQ, step-by-step guides, and troubleshooting",
      "Security hardening: input sanitization, a strict Content-Security-Policy, and rate limiting",
      "Code quality tooling with ESLint, Prettier, strict TypeScript, and pre-commit hooks",
    ],
    changes: [
      {
        type: "feat",
        description: "In-app help center with FAQ, guides, troubleshooting, and contact pages",
      },
      {
        type: "feat",
        description: "Contextual help links across the anchor, verify, and groups flows",
      },
      {
        type: "feat",
        description: "What's-new prompts and FAQ answers surfaced in the command palette",
      },
      { type: "feat", description: "Input sanitization applied to every user-supplied field" },
      { type: "feat", description: "Client-side rate limiting on search, feed, and stats" },
      {
        type: "feat",
        description: "Structured Content-Security-Policy and hardened response headers",
      },
      {
        type: "chore",
        description: "Dependency audit across all packages with a CI gate at high severity",
      },
      { type: "docs", description: "SECURITY.md with a vulnerability reporting process" },
    ],
  },
  {
    version: "1.5.0",
    date: "2026-06-10",
    title: "Developer portal, API playground, and API keys",
    highlights: [
      "Developer portal with a live API playground for every GET endpoint",
      "Scoped API keys you manage entirely in the browser",
      "Copy-ready integration examples for JavaScript, Python, cURL, and CI",
    ],
    changes: [
      {
        type: "feat",
        description: "Developer portal at /developers with an interactive API playground",
      },
      { type: "feat", description: "Scoped API key management stored client-side" },
      {
        type: "feat",
        description: "Integration guides for JavaScript, Python, cURL, and GitHub Actions",
      },
      { type: "feat", description: "Webhook subscription manager and tester with signed payloads" },
      { type: "fix", description: "More resilient read retries against the Hiro API" },
      { type: "docs", description: "Expanded API reference and developer integration guides" },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-05-22",
    title: "Watchlist, collections, live updates, and notifications",
    highlights: [
      "Watchlist for hashes, wallets, and groups with on-chain status monitoring",
      "Document collections you can organize, share, and import",
      "Real-time live updates across the feed, stats, and explorer",
      "Unified notification center with optional browser push",
    ],
    changes: [
      { type: "feat", description: "Watchlist for hashes, wallets, and groups with status checks" },
      { type: "feat", description: "Document collections with sharing and import" },
      { type: "feat", description: "Real-time live updates with an event ticker" },
      { type: "feat", description: "Unified notification center with per-type preferences" },
      { type: "feat", description: "Flexible tagging with a tag cloud and cross-page filters" },
      {
        type: "feat",
        description: "Full data portability with backup, restore, and privacy controls",
      },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-05-08",
    title: "Calendar, activity log, wallet profiles, and comparisons",
    highlights: [
      "Contribution calendar with streaks and per-day detail",
      "Unified activity log across all five contracts",
      "Public wallet profiles with stats and an embeddable badge",
      "Side-by-side anchor comparison",
    ],
    changes: [
      { type: "feat", description: "Calendar view with a contribution graph and streak tracking" },
      { type: "feat", description: "Unified activity log across all contracts with filters" },
      {
        type: "feat",
        description: "Public wallet profiles with stats, recent anchors, and a badge",
      },
      { type: "feat", description: "Side-by-side anchor comparison with shareable links" },
      { type: "feat", description: "Compliance-grade audit trail with integrity verification" },
      { type: "test", description: "Expanded boundary and cross-contract test coverage" },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-04-24",
    title: "Templates, tags, embeddable badges, and search",
    highlights: [
      "Structured anchor templates for papers, code, datasets, and certificates",
      "Embeddable verification badges and social sharing cards",
      "Cross-contract search by hash, wallet, or label",
    ],
    changes: [
      { type: "feat", description: "Anchor templates with a live label preview" },
      { type: "feat", description: "Embeddable 'Verified on Stacks' badge and Open Graph card" },
      { type: "feat", description: "Cross-contract search by hash, wallet, or label" },
      { type: "feat", description: "Bulk verification and multi-document verification reports" },
      { type: "feat", description: "Hash matcher with file previews and thumbnails" },
      { type: "fix", description: "Correct verification of batch-anchored documents by owner" },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-04-10",
    title: "Stats, feed, docs site, CLI, SDK, and GitHub Action",
    highlights: [
      "Protocol stats dashboard and a public anchor feed",
      "TypeScript SDK and a terminal CLI",
      "GitHub Action to gate CI pipelines on an on-chain anchor",
    ],
    changes: [
      { type: "feat", description: "Protocol stats dashboard with daily series" },
      { type: "feat", description: "Public anchor feed with RSS, Atom, and JSON formats" },
      { type: "feat", description: "Documentation site with guides and reference" },
      { type: "feat", description: "thesislock-sdk TypeScript package for verification" },
      { type: "feat", description: "thesislock-cli with verify, hash, status, search, and batch" },
      { type: "feat", description: "GitHub Action to verify an anchor in CI" },
      { type: "feat", description: "Public REST API for verification, search, stats, and badges" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-28",
    title: "Core anchoring, batch, registry, proof NFTs, and groups",
    highlights: [
      "Client-side SHA-256 anchoring on the Stacks blockchain",
      "Batch anchoring and a per-wallet anchor registry",
      "Soulbound proof NFTs and collaborative anchor groups",
    ],
    changes: [
      { type: "feat", description: "Single-document anchoring with client-side SHA-256 hashing" },
      { type: "feat", description: "Batch anchoring of up to ten files in one transaction" },
      { type: "feat", description: "Per-principal anchor registry powering anchor history" },
      { type: "feat", description: "Soulbound SIP-009 proof NFTs" },
      { type: "feat", description: "Named groups for collaborative anchoring" },
      { type: "feat", description: "Public verification page with a file re-upload check" },
      { type: "test", description: "Clarity contract test suite across all five contracts" },
    ],
  },
];

/** The current release (the newest entry in RELEASES). */
export const LATEST_RELEASE: Release = RELEASES[0]!;

// A stable build timestamp. Prefers a build-time injected value
// (NEXT_PUBLIC_BUILD_DATE is inlined at build, so it is identical on the server
// and in every browser); otherwise it falls back to the current release date.
// This avoids a module-load `new Date()`, which in the browser would read as the
// visitor's current time rather than the deployment date.
export const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? LATEST_RELEASE.date;
