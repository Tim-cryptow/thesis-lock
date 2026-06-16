import { validateStacksAddress } from "@stacks/transactions";
import { getAnchorCount, getRecentAnchors, type RegistryEntry } from "./stacks";
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
// are real mainnet (SP) or testnet (ST) principals. validateStacksAddress does
// the c32 checksum; the prefix guard keeps contract and multisig principals out.
export function isValidProfileAddress(address: string): boolean {
  const addr = address.toUpperCase();
  if (!/^S[PT][0-9A-Z]{5,40}$/.test(addr)) return false;
  return validateStacksAddress(addr);
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
    recentAnchors = recent
      .filter((entry): entry is RegistryEntry => entry !== null)
      .slice(0, RECENT_LIMIT);
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
    const type = labelType(label);
    if (type) labelCounts.set(type, (labelCounts.get(type) ?? 0) + 1);
  }

  // Fall back to the registry's recent anchors for document types when the tx
  // scan surfaced none (e.g. a wallet whose anchors predate the scan window).
  if (labelCounts.size === 0) {
    for (const entry of recentAnchors) {
      const type = labelType(entry.label);
      if (type) labelCounts.set(type, (labelCounts.get(type) ?? 0) + 1);
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
