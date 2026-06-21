![CI](https://github.com/Tim-cryptow/thesis-lock/actions/workflows/ci.yml/badge.svg) ![Status](https://thesis-lock.vercel.app/api/status/badge) [![RSS](https://img.shields.io/badge/RSS-feed-orange)](https://thesis-lock.vercel.app/api/feed/rss)

# ThesisLock

ThesisLock anchors a SHA-256 hash of any document on the Stacks blockchain, giving you a permanent, verifiable timestamp without ever exposing the file. Drop a document into the page, the browser hashes it locally, you sign a transaction with your Stacks wallet, and anyone can later visit a verification URL to confirm when it was anchored, by which wallet, and what label was attached.

## Live demo

- App: [thesis-lock.vercel.app](https://thesis-lock.vercel.app/)
- Docs: [thesis-lock.vercel.app/docs](https://thesis-lock.vercel.app/docs)
- Deployer: [`SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`](https://explorer.hiro.so/address/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM?chain=mainnet)

## Features

- Single file anchoring with optional ASCII label up to 64 characters.
- Anchor templates at `/templates`: structured label formats for papers, legal documents, code releases, datasets, and certificates, with a live label preview and parsed fields shown on verify and history pages.
- Batch anchoring of up to ten files in a single transaction.
- Per-wallet anchor history at `/anchors`, populated automatically when you anchor.
- Unified activity log at `/activity`: a chronological timeline of every interaction across all five contracts (anchors, batches, registry entries, proof mints, and group actions), with category filters, date separators, and infinite scroll. Also exposed as JSON at `/api/activity`.
- Anchor groups at `/groups`: create a named group, add members, and anchor documents under a shared, on-chain history.
- Client-side SHA-256 hashing. The file never leaves your device.
- Public verification at `/v/<hash>` with file re-upload check, plus bulk verification at `/verify-bulk`.
- Formal verification reports in HTML, JSON, and CSV at `/report`: a multi-document audit report with a table of contents, summary statistics, and per-hash verification details across every contract, generated from dropped files, pasted hashes, or your own anchors. Exposed as JSON, HTML, or CSV at `/api/report`.
- Side-by-side anchor comparison at `/compare`: drop or paste two hashes to see which was anchored first, the estimated time gap, and how their owner, label, source, template, and proof differ, with highlighted differences and shareable comparison links. Exposed as JSON at `/api/compare`.
- Public feed at `/feed` and cross-contract search at `/search`.
- Real-time live updates with event ticker and auto-refreshing pages: a single visibility-aware poller streams new on-chain events into a scrolling activity ticker, prepends new anchors to the feed, ticks the stats counters up live, and surfaces fresh calls in the contract explorer, all pausable from any Live indicator.
- Public wallet profiles at `/u/<principal>`: anyone's anchoring history as a verifiable portfolio, with anchor, batch, group, and proof totals, recent anchors, and the document types they anchor. Exposed as JSON at `/api/profile/<principal>` and as a shields-style badge at `/api/profile-badge/<principal>`.
- Embeddable badges at `/embed`: a shields-style "Verified on Stacks" SVG badge (`/api/badge/<hash>`) and a social sharing card (`/api/card/<hash>`) for any anchored hash.
- Optional soulbound proof NFTs (SIP-009) as permanent in-wallet evidence of an anchor.
- [Developer Portal](https://thesis-lock.vercel.app/developers) at `/developers` with an API playground, key management, and integration guides: pick any GET endpoint and send live requests with a copy-ready curl command, create scoped API keys (stored client-side), and copy ready-to-run examples for JavaScript, Python, cURL, GitHub Actions, and CI/CD.
- Document and wallet watchlist with status monitoring at `/watchlist`: save document hashes, wallets, and groups, then track whether a hash has been anchored or a wallet or group has new anchors, with auto-check on load, manual refresh, and update badges on the nav link and dashboard widget. Stored entirely in the browser.
- Unified notification center at `/notifications`: aggregates transaction confirmations, watchlist status changes, new protocol anchors, and group activity in one place, with a corner bell showing unread count and recent items, optional browser push for important events, a synthesized sound alert, and per-type preferences. Stored entirely in the browser.
- Document collections for organizing and sharing anchored documents at `/collections`: create named, color-coded folders, add anchors by hash, file, or from your wallet, reorder and annotate items, then verify all, generate a report, export, or share a collection as a link others can verify and import. Stored entirely in the browser.
- Flexible tagging system at `/tags`: add multiple tags to any anchor and filter by tag across history, the feed, and search, with auto-suggestions from template labels, a usage-scaled tag cloud, per-tag stats, and rename, merge, recolor, and delete. Tags travel with collection exports and are stored entirely in the browser.
- Interactive onboarding tour and command palette (Ctrl+K): a guided seventeen-step walkthrough that introduces the main features to first-time visitors and can be restarted any time, plus a keyboard-first command palette to jump to any page or run a common action with fuzzy search.
- On-chain contract explorer at `/explorer` with interactive read-only function calls: browse every contract's functions, maps, and data variables, watch recent on-chain calls, read an architecture diagram of how the five contracts relate, and call read-only functions directly from the UI. Exposed as JSON at `/api/explorer/<contract>`.
- Built-in performance monitoring with Web Vitals and API metrics at `/performance`: a client-side dashboard tracking Core Web Vitals (LCP, INP, CLS, FCP, TTFB, FID) with ratings and sparklines, per-page load and render times, and per-endpoint API response times, error rates, and cache hits, plus an optional debug overlay. Captured with the browser's Performance APIs and stored entirely on the device, no external analytics.
- Compliance-grade audit trail with integrity verification and exportable reports at `/audit`: every interaction is recorded in a tamper-evident, browser-local log with a re-verifiable SHA-256 integrity hash, filterable and paginated, with signed-style audit reports exportable as JSON, CSV, or printable HTML for academic and legal chain-of-custody. Stored entirely on the device.
- Public status page with uptime monitoring and incident tracking at `/status`: live health of all five contracts, the API endpoints, and the Hiro and Stacks dependencies, with response times, 24-hour uptime bars, and automatic plus manual incident reporting, exposed as JSON at `/api/status` and as an embeddable status badge at `/api/status/badge`.
- Calendar view with GitHub-style contribution graph and streak tracking at `/calendar`: your anchoring activity mapped to dates, with a year contribution graph, a monthly calendar, current and longest streaks, per-day anchor detail, and per-day report generation, plus a compact graph on the dashboard and on public wallet profiles. Built from your on-chain history.
- RSS/Atom/JSON feeds and webhook subscriptions for protocol events: standards-based feeds at `/api/feed/rss`, `/api/feed/atom`, and `/api/feed/json` (filterable by `?contract`, `?address`, and `?limit`, with autodiscovery links in the page head), plus a webhook subscription manager and tester in the developer portal with a signed (HMAC-SHA256) JSON payload format for Slack, Zapier, CI, and monitoring integrations.

## Protocol

Five Clarity 3 contracts deployed to Stacks mainnet at the same principal, `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`:

| Contract | Purpose |
| --- | --- |
| [`thesislock`](https://explorer.hiro.so/txid/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock?chain=mainnet) | Original single-hash anchor. One immutable record per hash. |
| `thesislock-batch` | Anchors up to ten hashes per transaction, keyed by `{ hash, owner }`. |
| `thesislock-registry` | Per-principal append-only index of anchors. Powers "My Anchors". |
| `thesislock-proof` | SIP-009 NFT issuing soulbound proof tokens. |
| [`thesislock-groups`](https://explorer.hiro.so/txid/0x4a698fca849d4c0ea7e28d020ab45ef1846c0e9fea39e128f3b48632473cd89a?chain=mainnet) | Named groups for collaborative anchoring under a shared history. |

The original `thesislock` contract was first deployed at Stacks block 7798720, burn block 947300 ([deploy transaction](https://explorer.hiro.so/txid/0xd1bdda30d03befb0023c9e1c34e71a7429d5f1b699424f60481b3a64df8f5d8e?chain=mainnet)).

## Stack

- Clarity 3 smart contracts on Stacks mainnet
- Clarinet for project structure, testing, and deployment
- Next.js 16 App Router with TypeScript and Tailwind
- Stacks Connect for wallet integration (Leather, Xverse, Asigna)
- Hiro Stacks API for read-only contract calls
- Vercel for hosting

## Local development

```bash
# Contracts
npm install
clarinet check
npm test

# Frontend
cd web
npm install
cp .env.example .env.local
npm run dev
```

## Documentation

Full guides and reference live at [thesis-lock.vercel.app/docs](https://thesis-lock.vercel.app/docs):

- [Getting Started](https://thesis-lock.vercel.app/docs/getting-started): what ThesisLock is and how to anchor your first document.
- [Getting Started Tour](https://thesis-lock.vercel.app/docs/getting-started-tour): the interactive onboarding tour, what it covers, and how to restart it.
- [Command Palette](https://thesis-lock.vercel.app/docs/command-palette): the Ctrl+K command palette for jumping to any page or running a common action.
- [Contracts](https://thesis-lock.vercel.app/docs/contracts): all five contracts, function signatures, and direct Hiro API calls.
- [Contract Explorer](https://thesis-lock.vercel.app/docs/explorer): browse contracts in the app with recent calls, an architecture diagram, and an interactive read-only tester.
- [Watchlist](https://thesis-lock.vercel.app/docs/watchlist): monitor specific hashes, wallets, and groups and track their status over time.
- [Collections](https://thesis-lock.vercel.app/docs/collections): organize anchored documents into named, browser-local collections and share them as links.
- [Web App Guide](https://thesis-lock.vercel.app/docs/web-app): anchoring, batches, groups, verification, and proof NFTs.
- [API Reference](https://thesis-lock.vercel.app/docs/api): the JSON REST API for verification, search, stats, badges, and cards.
- [SDK Guide](https://thesis-lock.vercel.app/docs/sdk): the `thesislock-sdk` TypeScript package ([`sdk/`](sdk/README.md)).
- [CLI Guide](https://thesis-lock.vercel.app/docs/cli): the `thesislock-cli` terminal tool ([`cli/`](cli/README.md)).
- [GitHub Action](https://thesis-lock.vercel.app/docs/github-action): gate a CI pipeline on an on-chain anchor ([`action/`](action/README.md)).
- [System Status](https://thesis-lock.vercel.app/docs/status): the public status page, what it monitors, and the status JSON API and badge.
- [Feeds](https://thesis-lock.vercel.app/docs/feeds): RSS, Atom, and JSON Feed endpoints for protocol events, with filtering and autodiscovery.
- [Webhooks](https://thesis-lock.vercel.app/docs/webhooks): event types, the signed JSON payload format, and signature verification.
