import { validateStacksAddress } from "@stacks/transactions";
import { fetchBatchAnchor } from "./hiroAnchor";
import { getAnchorByHash } from "./anchorsIndex";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";
const BATCH_CONTRACT_NAME = "thesislock-batch";

export const HEX_64 = /^[0-9a-f]{64}$/;

export type VerificationResult =
  | {
      verified: true;
      source: "single";
      hash: string;
      label: string;
      owner: string;
      stacksBlock: number;
      burnBlock: number;
      contract: string;
      verifyUrl: string;
    }
  | {
      verified: true;
      source: "batch";
      hash: string;
      label: string;
      owner: string;
      stacksBlock: number;
      burnBlock: number;
      batchId: number;
      contract: string;
      verifyUrl: string;
    }
  | {
      verified: false;
      hash: string;
      message: string;
    };

export function corsHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

function verifyUrl(origin: string, hash: string, owner: string | null): string {
  const base = `${origin}/v/${hash}`;
  return owner ? `${base}?owner=${owner}` : base;
}

// Resolves an anchor for an already-validated 64-hex hash. An explicit owner
// means the caller is asking about that owner-keyed batch record, so it takes
// precedence over a global single anchor with the same hash (the two contracts
// can carry unrelated records for one hash). This mirrors the verification UI.
export async function verifyHash(
  hash: string,
  ownerInput: string | undefined,
  origin: string,
): Promise<VerificationResult> {
  const ownerCandidate = ownerInput?.toUpperCase() ?? "";
  const owner = validateStacksAddress(ownerCandidate) ? ownerCandidate : null;

  if (owner) {
    const batch = await fetchBatchAnchor(hash, owner);
    if (batch) {
      return {
        verified: true,
        source: "batch",
        hash,
        label: batch.label,
        owner,
        stacksBlock: batch.stacksBlock,
        burnBlock: batch.burnBlock,
        batchId: batch.batchId,
        contract: `${CONTRACT_ADDRESS}.${BATCH_CONTRACT_NAME}`,
        verifyUrl: verifyUrl(origin, hash, owner),
      };
    }
  }

  // Single-anchor verification reads the live contract first (the source of
  // truth), so a stale index row never certifies a rolled-back anchor; the index
  // is only a fallback when the chain read is unreachable. getAnchorByHash
  // encapsulates that, returning null only on an authoritative not-found.
  const single = await getAnchorByHash(hash);
  if (single) {
    return {
      verified: true,
      source: "single",
      hash,
      label: single.label,
      owner: single.anchoredBy,
      stacksBlock: single.stacksBlock,
      burnBlock: single.burnBlock,
      contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`,
      verifyUrl: verifyUrl(origin, hash, null),
    };
  }

  return {
    verified: false,
    hash,
    message: "Hash not found. For batch anchors, include ?owner=<principal>.",
  };
}
