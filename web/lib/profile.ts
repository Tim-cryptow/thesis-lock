import { validateStacksAddress } from "@stacks/transactions";
import {
  getAnchorCount,
  getRecentAnchors,
  readAnchor,
  readBatchAnchor,
  type RegistryEntry,
} from "./stacks";
import { fetchActivityLog, type ActivityEvent } from "./activityLog";
import { parseLabel } from "./templates";

// A public, read-only summary of one wallet's anchoring activity across every
// ThesisLock contract. It powers the /u/<principal> profile page, the JSON
// profile API, and the embeddable badge. Counts come from two sources: the
// registry read-only functions (authoritative anchor count and recent anchors)
// and the wallet's Hiro contract-call history (batch, group, and proof totals,
// plus first and last activity blocks).

export type WalletProfile = {
  address: string;
  totalAnchors: number;
  totalBatches: number;
  groupsCreated: number;
  proofNFTs: number;
  firstSeen: number;
  lastSeen: number;
  recentAnchors: RegistryEntry[];
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
// each shown entry resolves to an actual single or batch anchor before
// publishing it with a verify link (mirrors the feed's registry validation).
// Returns true on a transient lookup error so a Hiro hiccup keeps a real anchor
// rather than hiding it; only entries that resolve to "none" in both contracts
// are dropped.
async function isBackedAnchor(
  owner: string,
  entry: RegistryEntry,
): Promise<boolean> {
  try {
    const batch = await readBatchAnchor(entry.hash, owner);
    if (batch) return true;
    const single = await readAnchor(entry.hash);
    return single !== null && single.anchoredBy.toUpperCase() === owner;
  } catch {
    return true;
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
export async function fetchWalletProfile(
  address: string,
): Promise<WalletProfile> {
  const addr = address.toUpperCase();
  if (!isValidProfileAddress(addr)) return emptyProfile(addr);

  let totalAnchors = 0;
  try {
    totalAnchors = await getAnchorCount(addr);
  } catch {
    totalAnchors = 0;
  }

  let recentAnchors: RegistryEntry[] = [];
  try {
    const recent = await getRecentAnchors(addr);
    const candidates = recent
      .filter((entry): entry is RegistryEntry => entry !== null)
      .slice(0, RECENT_LIMIT);
    // Drop registry rows that aren't backed by a real anchor so the profile
    // never shows entries whose verify link reports "not anchored".
    const backed = await Promise.all(
      candidates.map((entry) => isBackedAnchor(addr, entry)),
    );
    recentAnchors = candidates.filter((_, i) => backed[i]);
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

    const label =
      typeof event.details?.label === "string" ? event.details.label : "";
    const hash =
      typeof event.details?.hash === "string" ? event.details.hash : "";
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

  // Always fold the registry's recent anchors into the document-type counts.
  // A batch-anchor activity event carries only a count and no per-entry labels,
  // so the registry (which records each batch-anchored hash with its label) is
  // the only source of batch document types; merging it unconditionally keeps a
  // mixed single+batch wallet from dropping its batch labels. Hashes already
  // counted from an event are skipped so single anchors are not double-counted.
  for (const entry of recentAnchors) {
    if (countedHashes.has(entry.hash)) continue;
    const type = labelType(entry.label);
    if (type) labelCounts.set(type, (labelCounts.get(type) ?? 0) + 1);
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
