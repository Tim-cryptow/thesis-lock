import {
  bufferCV,
  cvToValue,
  deserializeCV,
  principalCV,
  serializeCV,
  uintCV,
  validateStacksAddress,
} from "@stacks/transactions";
import { hexToBytes } from "@stacks/common";

const HIRO_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.mainnet.hiro.so";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";
const BATCH_CONTRACT_NAME = "thesislock-batch";
const PROOF_CONTRACT_NAME = "thesislock-proof";

const HEX_64 = /^[0-9a-f]{64}$/;

export type FetchedAnchor = {
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
  label: string;
};

export type FetchedBatchAnchor = {
  label: string;
  stacksBlock: number;
  burnBlock: number;
  batchId: number;
};

export type FetchedProof = {
  hash: string;
  label: string;
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
};

function stripHex(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

// cvToValue may return a plain tuple ({ "stacks-block": 123 }) or the verbose
// Clarity form ({ value: { "stacks-block": { value: "123" } } }) depending on
// the @stacks/transactions version. These helpers read either shape.
function tupleFields(value: unknown): Record<string, unknown> {
  if (
    value &&
    typeof value === "object" &&
    "value" in value &&
    typeof (value as { value: unknown }).value === "object"
  ) {
    return (value as { value: Record<string, unknown> }).value;
  }
  return value as Record<string, unknown>;
}

function fieldValue(field: unknown): unknown {
  if (field && typeof field === "object" && "value" in field) {
    return (field as { value: unknown }).value;
  }
  return field;
}

function withHexPrefix(hex: string): string {
  return hex.startsWith("0x") ? hex : `0x${hex}`;
}

async function callReadOnly(
  contract: string,
  fn: string,
  args: string[],
): Promise<unknown> {
  const url = `${HIRO_BASE}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${contract}/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: CONTRACT_ADDRESS,
      arguments: args.map(withHexPrefix),
    }),
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { okay?: boolean; result?: string };
  if (!data.okay || !data.result) return null;
  const cv = deserializeCV(data.result);
  return cvToValue(cv, true);
}

export async function fetchAnchor(
  hash: string,
): Promise<FetchedAnchor | null> {
  if (!HEX_64.test(hash)) return null;
  const hashArg = serializeCV(bufferCV(hexToBytes(stripHex(hash))));
  const value = await callReadOnly(CONTRACT_NAME, "get-anchor", [hashArg]);
  if (value === null || value === undefined) return null;
  const v = tupleFields(value);
  return {
    anchoredBy: String(fieldValue(v["anchored-by"]) ?? ""),
    stacksBlock: Number(fieldValue(v["stacks-block"]) ?? 0),
    burnBlock: Number(fieldValue(v["burn-block"]) ?? 0),
    label: String(fieldValue(v["label"]) ?? ""),
  };
}

export async function fetchBatchAnchor(
  hash: string,
  owner: string,
): Promise<FetchedBatchAnchor | null> {
  if (!HEX_64.test(hash)) return null;
  if (!validateStacksAddress(owner)) return null;
  const hashArg = serializeCV(bufferCV(hexToBytes(stripHex(hash))));
  const ownerArg = serializeCV(principalCV(owner));
  const value = await callReadOnly(BATCH_CONTRACT_NAME, "get-batch-anchor", [
    hashArg,
    ownerArg,
  ]);
  if (value === null || value === undefined) return null;
  const v = tupleFields(value);
  return {
    label: String(fieldValue(v["label"]) ?? ""),
    stacksBlock: Number(fieldValue(v["stacks-block"]) ?? 0),
    burnBlock: Number(fieldValue(v["burn-block"]) ?? 0),
    batchId: Number(fieldValue(v["batch-id"]) ?? 0),
  };
}

// Resolves the soulbound proof token id minted for a hash, or null when none
// exists. The proof contract is keyed by hash alone, so no owner is needed.
// get-token-id-by-hash returns an optional uint; cvToValue unwraps it to the
// number, the verbose { value } shape, or null on a miss.
export async function fetchProofIdByHash(
  hash: string,
): Promise<number | null> {
  if (!HEX_64.test(hash)) return null;
  const hashArg = serializeCV(bufferCV(hexToBytes(stripHex(hash))));
  const value = await callReadOnly(
    PROOF_CONTRACT_NAME,
    "get-token-id-by-hash",
    [hashArg],
  );
  if (value === null || value === undefined) return null;
  const id = Number(fieldValue(value));
  return Number.isFinite(id) ? id : null;
}

export async function fetchProof(
  tokenId: number,
): Promise<FetchedProof | null> {
  if (!Number.isInteger(tokenId) || tokenId < 0) return null;
  const idArg = serializeCV(uintCV(tokenId));
  const value = await callReadOnly(PROOF_CONTRACT_NAME, "get-proof", [idArg]);
  if (value === null || value === undefined) return null;
  const v = tupleFields(value);
  return {
    hash: stripHex(String(fieldValue(v["hash"]) ?? "")),
    label: String(fieldValue(v["label"]) ?? ""),
    anchoredBy: String(fieldValue(v["anchored-by"]) ?? ""),
    stacksBlock: Number(fieldValue(v["stacks-block"]) ?? 0),
    burnBlock: Number(fieldValue(v["burn-block"]) ?? 0),
  };
}
