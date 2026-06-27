import { validateStacksAddress } from "@stacks/transactions";
import {
  getAnchorCount,
  getRecentAnchors,
  readAnchor,
  readBatchAnchor,
  type RegistryEntry,
} from "./stacks";
import { getAnchorsByPrincipal } from "./anchorsIndex";
import { fetchActivityLog, type ActivityEvent } from "./activityLog";
import { parseLabel } from "./templates";

// A public, read-only summary of one wallet's anchoring activity across every
// ThesisLock contract. It powers the /u/<principal> profile page, the JSON
// profile API, and the embeddable badge. Counts come from two sources: the
// registry read-only functions (authoritative anchor count and recent anchors)
// and the wallet's Hiro contract-call history (batch, group, and proof totals,
// plus first and last activity blocks).

// A validated registry anchor plus the contract that actually backs it. The
// source lets the profile build a verify link that resolves to the displayed
// record: an `?owner=` param forces VerifyClient to prefer the owner-keyed batch
// record, so a single-backed row must link without it.
export type ProfileAnchor = RegistryEntry & {
  source: "single" | "batch";
};

export type WalletProfile = {
  address: string;
  totalAnchors: number;
  totalBatches: number;
  groupsCreated: number;
  proofNFTs: number;
  firstSeen: number;
  lastSeen: number;
  recentAnchors: ProfileAnchor[];
  topLabels: string[];
};

// How many of the wallet's recent registry anchors the profile shows.
const RECENT_LIMIT = 10;
// Top document types to surface from the wallet's labels.
const TOP_LABELS_LIMIT = 5;
// Each Hiro page holds 50 transactions; scanning a few pages keeps the profile
// cheap while covering the vast majority of wallets in full. A wallet busier
// than this still gets correct registry counts; only the tx-derived totals and
// firstSeen reflect the scanned window.
const SCAN_PAGE_SIZE = 50;
const MAX_SCAN_PAGES = 6;

// Profiles are public and unauthenticated, so the only addresses worth a lookup
// are standard Stacks wallet principals: SP/SM on mainnet and ST/SN on testnet,
// the same S[PMNT] set the verify and feed pages accept (SM/SN are multisig
// wallets such as Asigna). validateStacksAddress does the c32 checksum; the
// prefix guard keeps contract principals out.
export function isValidProfileAddress(address: string): boolean {
  const addr = address.toUpperCase();
  if (!/^S[PMNT][0-9A-Z]{5,40}$/.test(addr)) return false;
  return validateStacksAddress(addr);
}

// The registry is a self-asserted index: register-anchor accepts any hash with
// no check that it is backed by a real anchor, so a public profile must confirm
// each shown entry resolves to an actual anchor before publishing it with a
// verify link (mirrors the feed's registry validation). Returns which contract
// backs the hash, or null when neither does. The single contract is checked
// first so a hash that exists as both a single and an owner-keyed batch links to
// the single record the registry row represents. A lookup that throws before a
// source is confirmed returns null (drop the row): an unconfirmed anchor must
// not be published as a confirmed one, which would yield a verify link that can
// report "not anchored" or point at the wrong record.
async function anchorSource(
  owner: string,
  entry: RegistryEntry,
): Promise<"single" | "batch" | null> {
  try {
    const single = await readAnchor(entry.hash);
    if (single !== null && single.anchoredBy.toUpperCase() === owner) {
      return "single";
    }
    const batch = await readBatchAnchor(entry.hash, owner);
    if (batch) return "batch";
    return null;
  } catch {
    return null;
  }
}

// Reduces a single label to the document "type" it represents: the template id
// when the label is a recognised structured label, otherwise the leading token
// of a free-form label. Returns null when there is nothing meaningful to group.
function labelType(label: string): string | null {
  if (!label) return null;
  const parsed = parseLabel(label);
  if (parsed.templateId) return parsed.templateId;
  const token = label.split(/[-:|\s]/).find((part) => part.length > 0);
  return token ? token.toLowerCase() : null;
}

function emptyProfile(address: string): WalletProfile {
  return {
    address,
    totalAnchors: 0,
    totalBatches: 0,
    groupsCreated: 0,
    proofNFTs: 0,
    firstSeen: 0,
    lastSeen: 0,
    recentAnchors: [],
    topLabels: [],
  };
}

// Aggregates a wallet's anchoring activity into a WalletProfile. Invalid
// addresses resolve to an empty profile rather than throwing, so callers can
// render a graceful empty state; transient Hiro failures degrade individual
// sections (an unreachable registry leaves counts at zero) without losing the
// rest of the profile.
export async function fetchWalletProfile(address: string): Promise<WalletProfile> {
  const addr = address.toUpperCase();
  if (!isValidProfileAddress(addr)) return emptyProfile(addr);

  let totalAnchors = 0;
  try {
    totalAnchors = await getAnchorCount(addr);
  } catch {
    totalAnchors = 0;
  }

  let recentAnchors: ProfileAnchor[] = [];
  try {
    // Single anchors come from the index. The registry read still surfaces batch
    // anchors (and single anchors when the index is unavailable), validated
    // against their backing contract so the profile never shows an entry whose
    // verify link would report "not anchored".
    const indexSingles = await getAnchorsByPrincipal(addr, RECENT_LIMIT);
    const recent = await getRecentAnchors(addr);
    const candidates = recent
      .filter((entry): entry is RegistryEntry => entry !== null)
      .slice(0, RECENT_LIMIT);

    if (indexSingles !== null) {
      const indexAnchors: ProfileAnchor[] = indexSingles.map((a) => ({
        hash: a.hash,
        label: a.label,
        anchoredAt: a.stacksBlock,
        source: "single",
      }));
      const indexHashes = new Set(indexAnchors.map((a) => a.hash));
      // Only validate registry candidates the index didn't already confirm as a
      // single anchor; those resolve to batch (or are dropped if unbacked).
      const extra = candidates.filter((entry) => !indexHashes.has(entry.hash.toLowerCase()));
      const sources = await Promise.all(extra.map((entry) => anchorSource(addr, entry)));
      const extraAnchors: ProfileAnchor[] = extra
        .map((entry, i) => {
          const source = sources[i];
          return source ? { ...entry, hash: entry.hash.toLowerCase(), source } : null;
        })
        .filter((entry): entry is ProfileAnchor => entry !== null);
      recentAnchors = [...indexAnchors, ...extraAnchors]
        .sort((x, y) => y.anchoredAt - x.anchoredAt)
        .slice(0, RECENT_LIMIT);
    } else {
      // Index unavailable: fall back to the registry-validated set entirely.
      const sources = await Promise.all(candidates.map((entry) => anchorSource(addr, entry)));
      recentAnchors = candidates
        .map((entry, i) => {
          const source = sources[i];
          return source ? { ...entry, source } : null;
        })
        .filter((entry): entry is ProfileAnchor => entry !== null);
    }
  } catch {
    recentAnchors = [];
  }

  // Walk the wallet's contract-call history newest-first, stopping early once
  // Hiro reports no more pages so small wallets cost a single request.
  const events: ActivityEvent[] = [];
  for (let page = 0; page < MAX_SCAN_PAGES; page++) {
    let pageResult;
    try {
      pageResult = await fetchActivityLog(addr, page, SCAN_PAGE_SIZE);
    } catch {
      break;
    }
    events.push(...pageResult.events);
    if (!pageResult.hasMore) break;
  }

  let totalBatches = 0;
  let groupsCreated = 0;
  let proofNFTs = 0;
  let firstSeen = 0;
  let lastSeen = 0;
  const labelCounts = new Map<string, number>();
  const countedHashes = new Set<string>();

  for (const event of events) {
    if (event.type === "batch-anchor") totalBatches++;
    else if (event.type === "create-group") groupsCreated++;
    else if (event.type === "mint-proof") proofNFTs++;

    const block = event.blockHeight;
    if (block > 0) {
      if (lastSeen === 0 || block > lastSeen) lastSeen = block;
      if (firstSeen === 0 || block < firstSeen) firstSeen = block;
    }

    // A batch carries one label per document, so count each entry. This pulls
    // batch document types from the full scanned window rather than only the
    // recent registry rows below.
    if (event.type === "batch-anchor") {
      const entries = Array.isArray(event.details?.entries)
        ? (event.details.entries as Array<{ hash?: unknown; label?: unknown }>)
        : [];
      for (const entry of entries) {
        const entryHash = typeof entry.hash === "string" ? entry.hash : "";
        if (entryHash && countedHashes.has(entryHash)) continue;
        const entryType = labelType(typeof entry.label === "string" ? entry.label : "");
        if (entryType) {
          labelCounts.set(entryType, (labelCounts.get(entryType) ?? 0) + 1);
          if (entryHash) countedHashes.add(entryHash);
        }
      }
      continue;
    }

    const label = typeof event.details?.label === "string" ? event.details.label : "";
    const hash = typeof event.details?.hash === "string" ? event.details.hash : "";
    // Submitting a single anchor through the app emits both an anchor-document
    // and a register-anchor call for the same hash, so skip a hash already
    // counted to weight each document once rather than twice.
    if (hash && countedHashes.has(hash)) continue;
    const type = labelType(label);
    if (type) {
      labelCounts.set(type, (labelCounts.get(type) ?? 0) + 1);
      if (hash) countedHashes.add(hash);
    }
  }

  // Fold in any recent registry anchors not already counted from the scan, so a
  // wallet whose anchors predate the scanned transaction window still surfaces
  // its document types. Hashes seen in the scan are skipped to avoid
  // double-counting.
  for (const entry of recentAnchors) {
    if (countedHashes.has(entry.hash)) continue;
    const type = labelType(entry.label);
    if (type) {
      labelCounts.set(type, (labelCounts.get(type) ?? 0) + 1);
      countedHashes.add(entry.hash);
    }
  }

  const topLabels = [...labelCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_LABELS_LIMIT)
    .map(([type]) => type);

  return {
    address: addr,
    totalAnchors,
    totalBatches,
    groupsCreated,
    proofNFTs,
    firstSeen,
    lastSeen,
    recentAnchors,
    topLabels,
  };
}
