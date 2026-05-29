import { validateStacksAddress } from "@stacks/transactions";
import { fetchAnchor, fetchBatchAnchor } from "./hiroAnchor";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
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

export function corsHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
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

// Resolves an anchor for an already-validated 64-hex hash. Single anchors take
// precedence; the batch contract is keyed by hash and owner, so it is only
// consulted when an owner principal is supplied and no single anchor exists.
export async function verifyHash(
  hash: string,
  ownerInput: string | undefined,
  origin: string,
): Promise<VerificationResult> {
  const ownerCandidate = ownerInput?.toUpperCase() ?? "";
  const owner = validateStacksAddress(ownerCandidate) ? ownerCandidate : null;

  const single = await fetchAnchor(hash);
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

  return {
    verified: false,
    hash,
    message: "Hash not found. For batch anchors, include ?owner=<principal>.",
  };
}
