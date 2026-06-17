import { validateStacksAddress } from "@stacks/transactions";
import {
  fetchAnchor,
  fetchBatchAnchor,
  fetchProof,
  fetchProofIdByHash,
} from "./hiroAnchor";
import { findGroupAnchorByHash, getGroupAnchorByLocation } from "./groups";
import { parseLabel, type ParsedTemplate } from "./templates";

// Side-by-side comparison of two anchors. Users who anchor multiple versions of
// a document (thesis drafts, contract revisions, dataset updates) use this to
// confirm which version came first, whether one supersedes another, and how the
// metadata differs. It resolves each hash across every anchoring contract, then
// computes the relationships the verify and history pages cannot show alone.

export const HEX_64 = /^[0-9a-f]{64}$/;

// Stacks blocks settle on Bitcoin roughly every ten minutes, so the block gap
// between two anchors maps to an approximate wall-clock gap. This is an
// estimate, not a precise timestamp; callers label it as such.
const BLOCK_MINUTES = 10;

// One resolved anchor. `source` is the contract that backs it ("single",
// "batch", "group", or "proof"), or "none" when the hash is not anchored
// anywhere.
// `template` is the parsed label when the entry was found, and `proofNFT` is the
// soulbound proof token id minted for the hash, if any.
export type CompareEntry = {
  hash: string;
  label: string;
  owner: string;
  block: number;
  source: string;
  template?: ParsedTemplate;
  proofNFT?: number | null;
};

// The exact on-chain location of a group anchor: { group-id, index }. A hash can
// be anchored in several groups (or re-anchored in one), so a link that points
// at a specific group record carries its location to resolve that precise row
// rather than the first group event that happens to match the hash.
export type GroupLocation = { groupId: number; index: number };

// The computed relationship between two entries. `sameTemplate` and `supersedes`
// are not in the original field list but back the template-type and supersession
// badges the UI renders. `olderSide` and the diff flags are only meaningful when
// both entries were found; they default to "same"/false otherwise.
export type AnchorComparison = {
  left: CompareEntry;
  right: CompareEntry;
  timeDelta: { blocks: number; estimatedMinutes: number };
  sameOwner: boolean;
  sameLabel: boolean;
  sameSource: boolean;
  sameTemplate: boolean;
  olderSide: "left" | "right" | "same";
  supersedes: "left" | "right" | null;
};

function notFound(hash: string): CompareEntry {
  return {
    hash,
    label: "",
    owner: "",
    block: 0,
    source: "none",
    proofNFT: null,
  };
}

// Resolves a single hash across every contract, mirroring the verify page's
// precedence: an explicit owner means the caller is asking about that
// owner-keyed batch record, so it wins over a global single anchor with the
// same hash. Single is checked next, then the groups contract, and finally the
// proof contract (a hash anchored only via a proof mint is invisible to the
// other three). Each lookup is best-effort; a transient failure on one source
// falls through to the next rather than failing the whole comparison.
async function fetchCompareEntry(
  hash: string,
  owner?: string,
  group?: GroupLocation,
): Promise<CompareEntry> {
  const normalizedHash = hash.toLowerCase();
  if (!HEX_64.test(normalizedHash)) return notFound(normalizedHash);

  const ownerCandidate = owner?.toUpperCase();
  const validOwner =
    ownerCandidate && validateStacksAddress(ownerCandidate)
      ? ownerCandidate
      : undefined;

  // The proof NFT is keyed by hash alone and independent of which contract
  // anchored the document, so look it up once regardless of the source.
  let proofNFT: number | null = null;
  try {
    proofNFT = await fetchProofIdByHash(normalizedHash);
  } catch {
    proofNFT = null;
  }

  // An explicit group location asks about one specific group anchor, so resolve
  // it directly and prefer it over any single or batch record for the same
  // hash (mirrors the verify page's preferGroup ordering). The hash is confirmed
  // to match so a stale or tampered location falls through instead of showing an
  // unrelated record.
  if (group) {
    try {
      const located = await getGroupAnchorByLocation(
        group.groupId,
        group.index,
      );
      if (located && located.hash === normalizedHash) {
        return {
          hash: normalizedHash,
          label: located.label,
          owner: located.anchoredBy,
          block: located.stacksBlock,
          source: "group",
          template: parseLabel(located.label),
          proofNFT,
        };
      }
    } catch {
      // fall through to the hash-based lookups
    }
  }

  if (validOwner) {
    try {
      const batch = await fetchBatchAnchor(normalizedHash, validOwner);
      if (batch) {
        return {
          hash: normalizedHash,
          label: batch.label,
          owner: validOwner,
          block: batch.stacksBlock,
          source: "batch",
          template: parseLabel(batch.label),
          proofNFT,
        };
      }
    } catch {
      // fall through to the single and group lookups
    }
  }

  try {
    const single = await fetchAnchor(normalizedHash);
    if (single) {
      return {
        hash: normalizedHash,
        label: single.label,
        owner: single.anchoredBy,
        block: single.stacksBlock,
        source: "single",
        template: parseLabel(single.label),
        proofNFT,
      };
    }
  } catch {
    // fall through to the group lookup
  }

  try {
    const group = await findGroupAnchorByHash(normalizedHash);
    if (group) {
      return {
        hash: normalizedHash,
        label: group.label,
        owner: group.anchoredBy,
        block: group.stacksBlock,
        source: "group",
        template: parseLabel(group.label),
        proofNFT,
      };
    }
  } catch {
    // fall through to the proof and not-found results
  }

  // A hash can be anchored solely through the proof contract, which stores the
  // owner, label, and block alongside the soulbound token. Without this the
  // comparison would show the proof NFT number yet mark the document not found
  // and suppress the timeline and metadata diff. Resolve the proof token (its id
  // is already known) into a real entry before giving up.
  if (proofNFT !== null) {
    try {
      const proof = await fetchProof(proofNFT);
      if (proof && proof.hash.toLowerCase() === normalizedHash) {
        return {
          hash: normalizedHash,
          label: proof.label,
          owner: proof.anchoredBy,
          block: proof.stacksBlock,
          source: "proof",
          template: parseLabel(proof.label),
          proofNFT,
        };
      }
    } catch {
      // fall through to the not-found result
    }
  }

  return { ...notFound(normalizedHash), proofNFT };
}

// True when `label` declares that it supersedes the anchor at `otherHash`. The
// 64 char on-chain budget rules out embedding a full counterpart hash, so a
// supersession reference is the word "supersedes" alongside the full hash or a
// leading fragment of it (e.g. "v3-supersedes:1a2b3c4d"). Case-insensitive.
function labelSupersedes(label: string, otherHash: string): boolean {
  const lower = label.toLowerCase();
  if (!lower.includes("supersedes")) return false;
  const target = otherHash.toLowerCase();
  return lower.includes(target) || lower.includes(target.slice(0, 8));
}

// Compares two anchors and returns their resolved entries plus the relationships
// between them: the block and estimated time gap, which was anchored first,
// whether they share an owner, label, source, or template type, and whether one
// declares it supersedes the other. Both hashes are resolved in parallel.
export async function compareAnchors(
  hashA: string,
  hashB: string,
  ownerA?: string,
  ownerB?: string,
  groupA?: GroupLocation,
  groupB?: GroupLocation,
): Promise<AnchorComparison> {
  const [left, right] = await Promise.all([
    fetchCompareEntry(hashA, ownerA, groupA),
    fetchCompareEntry(hashB, ownerB, groupB),
  ]);

  const bothFound = left.source !== "none" && right.source !== "none";

  const blocks = bothFound ? Math.abs(left.block - right.block) : 0;
  const timeDelta = { blocks, estimatedMinutes: blocks * BLOCK_MINUTES };

  let olderSide: "left" | "right" | "same" = "same";
  if (bothFound) {
    if (left.block < right.block) olderSide = "left";
    else if (right.block < left.block) olderSide = "right";
  }

  const sameOwner =
    bothFound && left.owner.toUpperCase() === right.owner.toUpperCase();
  const sameLabel = bothFound && left.label === right.label;
  const sameSource = bothFound && left.source === right.source;
  const sameTemplate =
    bothFound &&
    (left.template?.templateId ?? null) === (right.template?.templateId ?? null);

  let supersedes: "left" | "right" | null = null;
  if (bothFound) {
    if (labelSupersedes(left.label, right.hash)) supersedes = "left";
    else if (labelSupersedes(right.label, left.hash)) supersedes = "right";
  }

  return {
    left,
    right,
    timeDelta,
    sameOwner,
    sameLabel,
    sameSource,
    sameTemplate,
    olderSide,
    supersedes,
  };
}
