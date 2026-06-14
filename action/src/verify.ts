import {
  cvToValue,
  deserializeCV,
  principalCV,
  serializeCV,
  uintCV,
  validateStacksAddress,
} from "@stacks/transactions";

const DEFAULT_API_URL = "https://api.mainnet.hiro.so";
const DEFAULT_CONTRACT_ADDRESS = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const SINGLE_CONTRACT = "thesislock";
const BATCH_CONTRACT = "thesislock-batch";
const PROOF_CONTRACT = "thesislock-proof";

const HEX_64 = /^[0-9a-f]{64}$/;

// Clarity serializes a (buff 32) as the type byte 0x02, a big-endian 4-byte
// length (0x00000020 = 32), then the raw bytes. This matches
// serializeCV(bufferCV(...)) without pulling in the buffer helpers.
const BUFF_32_PREFIX = "0200000020";

export type VerifySource = "single" | "batch" | "proof" | "group";

export type VerifyResult = {
  verified: boolean;
  source: VerifySource | null;
  block: number | null;
  label: string;
  owner: string | null;
};

export type VerifyOptions = {
  apiUrl?: string;
  contractAddress?: string;
};

function stripHex(hex: string): string {
  return hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
}

export function normalizeHash(input: string): string | null {
  const clean = stripHex(input.trim()).toLowerCase();
  return HEX_64.test(clean) ? clean : null;
}

function withHexPrefix(hex: string): string {
  return hex.startsWith("0x") ? hex : `0x${hex}`;
}

function serializeHash(hash: string): string {
  return BUFF_32_PREFIX + hash;
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

async function callReadOnly(
  apiUrl: string,
  contractAddress: string,
  contract: string,
  fn: string,
  args: string[],
): Promise<unknown> {
  const url = `${apiUrl}/v2/contracts/call-read/${contractAddress}/${contract}/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: contractAddress,
      arguments: args.map(withHexPrefix),
    }),
  });
  if (!res.ok) {
    throw new Error(`Hiro read-only call failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { okay?: boolean; result?: string; cause?: string };
  if (!data.okay || !data.result) return null;
  return cvToValue(deserializeCV(data.result), true);
}

async function verifySingle(
  hash: string,
  apiUrl: string,
  contractAddress: string,
): Promise<VerifyResult | null> {
  const value = await callReadOnly(apiUrl, contractAddress, SINGLE_CONTRACT, "get-anchor", [
    serializeHash(hash),
  ]);
  if (value === null || value === undefined) return null;
  const v = tupleFields(value);
  return {
    verified: true,
    source: "single",
    block: Number(fieldValue(v["stacks-block"]) ?? 0),
    label: String(fieldValue(v["label"]) ?? ""),
    owner: String(fieldValue(v["anchored-by"]) ?? ""),
  };
}

async function verifyBatch(
  hash: string,
  owner: string,
  apiUrl: string,
  contractAddress: string,
): Promise<VerifyResult | null> {
  const value = await callReadOnly(apiUrl, contractAddress, BATCH_CONTRACT, "get-batch-anchor", [
    serializeHash(hash),
    serializeCV(principalCV(owner)),
  ]);
  if (value === null || value === undefined) return null;
  const v = tupleFields(value);
  return {
    verified: true,
    source: "batch",
    block: Number(fieldValue(v["stacks-block"]) ?? 0),
    label: String(fieldValue(v["label"]) ?? ""),
    owner,
  };
}

async function verifyProof(
  hash: string,
  apiUrl: string,
  contractAddress: string,
): Promise<VerifyResult | null> {
  const idValue = await callReadOnly(
    apiUrl,
    contractAddress,
    PROOF_CONTRACT,
    "get-token-id-by-hash",
    [serializeHash(hash)],
  );
  if (idValue === null || idValue === undefined) return null;
  const tokenId = Number(fieldValue(idValue));
  if (!Number.isInteger(tokenId) || tokenId < 0) return null;

  const value = await callReadOnly(apiUrl, contractAddress, PROOF_CONTRACT, "get-proof", [
    serializeCV(uintCV(tokenId)),
  ]);
  if (value === null || value === undefined) return null;
  const v = tupleFields(value);
  return {
    verified: true,
    source: "proof",
    block: Number(fieldValue(v["stacks-block"]) ?? 0),
    label: String(fieldValue(v["label"]) ?? ""),
    owner: String(fieldValue(v["anchored-by"]) ?? ""),
  };
}

const NOT_VERIFIED: VerifyResult = {
  verified: false,
  source: null,
  block: null,
  label: "",
  owner: null,
};

/**
 * Resolve a 64-hex hash against the ThesisLock contracts. Checks the single
 * anchor, then the owner-keyed batch anchor when an owner is supplied, then the
 * proof NFT. Returns the first match, or an unverified result.
 */
export async function verifyHash(
  hash: string,
  owner?: string,
  options: VerifyOptions = {},
): Promise<VerifyResult> {
  const normalized = normalizeHash(hash);
  if (!normalized) {
    throw new Error("Invalid hash: expected a 64-character hex SHA-256 digest");
  }

  const apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
  const contractAddress = options.contractAddress ?? DEFAULT_CONTRACT_ADDRESS;

  const single = await verifySingle(normalized, apiUrl, contractAddress);
  if (single) return single;

  if (owner) {
    const ownerNormalized = owner.trim().toUpperCase();
    if (!validateStacksAddress(ownerNormalized)) {
      throw new Error(`Invalid Stacks principal: ${owner}`);
    }
    const batch = await verifyBatch(normalized, ownerNormalized, apiUrl, contractAddress);
    if (batch) return batch;
  }

  const proof = await verifyProof(normalized, apiUrl, contractAddress);
  if (proof) return proof;

  return NOT_VERIFIED;
}
