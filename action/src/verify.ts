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
const GROUPS_CONTRACT = "thesislock-groups";

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

// Group anchors are keyed on chain by { group-id, index }, not by hash, so the
// only way to resolve one from a hash is to scan the contract's print events.
// This mirrors cli/src/search.ts.
type RawEvent = {
  contract_log?: { value?: { hex?: string } };
};

const GROUPS_PAGE = 50;
// Hard guard against a runaway loop, set far above any realistic event count.
const GROUPS_OFFSET_CAP = 50_000;

async function verifyGroup(
  hash: string,
  apiUrl: string,
  contractAddress: string,
): Promise<VerifyResult | null> {
  let offset = 0;
  while (offset < GROUPS_OFFSET_CAP) {
    const url = `${apiUrl}/extended/v1/contract/${contractAddress}.${GROUPS_CONTRACT}/events?limit=${GROUPS_PAGE}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) {
      // Surface a transient API failure instead of reporting the hash as
      // absent: a rate-limited or 5xx response is not proof of non-existence.
      throw new Error(`Hiro events fetch failed: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as { results?: RawEvent[] };
    const events = Array.isArray(data.results) ? data.results : [];

    for (const ev of events) {
      const tupleHex = ev.contract_log?.value?.hex;
      if (!tupleHex) continue;
      let tuple: Record<string, unknown>;
      try {
        const decoded = cvToValue(deserializeCV(stripHex(tupleHex)), true);
        if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) continue;
        tuple = decoded as Record<string, unknown>;
      } catch {
        continue;
      }
      if (String(fieldValue(tuple["event"]) ?? "") !== "group-anchor-added") continue;
      const eventHash = stripHex(String(fieldValue(tuple["hash"]) ?? "")).toLowerCase();
      if (eventHash !== hash) continue;
      return {
        verified: true,
        source: "group",
        block: Number(fieldValue(tuple["stacks-block"]) ?? 0),
        label: String(fieldValue(tuple["label"]) ?? ""),
        owner: String(fieldValue(tuple["anchored-by"]) ?? ""),
      };
    }

    if (events.length < GROUPS_PAGE) break;
    offset += GROUPS_PAGE;
  }
  return null;
}

const NOT_VERIFIED: VerifyResult = {
  verified: false,
  source: null,
  block: null,
  label: "",
  owner: null,
};

/**
 * Resolve a 64-hex hash against the ThesisLock contracts. When an owner is
 * supplied, the owner-keyed batch anchor is checked first: an explicit owner
 * selects that batch record, and the same hash can exist independently in the
 * single contract under a different wallet. Otherwise it falls through to the
 * single anchor, the proof NFT, and finally group anchors. Returns the first
 * match, or an unverified result.
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

  if (owner) {
    const ownerNormalized = owner.trim().toUpperCase();
    if (!validateStacksAddress(ownerNormalized)) {
      throw new Error(`Invalid Stacks principal: ${owner}`);
    }
    const batch = await verifyBatch(normalized, ownerNormalized, apiUrl, contractAddress);
    if (batch) return batch;
  }

  const single = await verifySingle(normalized, apiUrl, contractAddress);
  if (single) return single;

  const proof = await verifyProof(normalized, apiUrl, contractAddress);
  if (proof) return proof;

  const group = await verifyGroup(normalized, apiUrl, contractAddress);
  if (group) return group;

  return NOT_VERIFIED;
}
