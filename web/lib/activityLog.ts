import { cvToValue, deserializeCV } from "@stacks/transactions";
import { fetchWithRetry } from "./fetchWithRetry";

// A unified, per-wallet activity log over every ThesisLock contract. Unlike the
// feed (contract print events) or My Anchors (registry entries), this reads the
// wallet's own contract-call transactions from Hiro and parses each one into a
// typed event, so anchors, batches, registry entries, proof mints, and every
// group action land in a single chronological timeline.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hiro.so";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const SINGLE_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";
const BATCH_CONTRACT = "thesislock-batch";
const REGISTRY_CONTRACT = "thesislock-registry";
const PROOF_CONTRACT = "thesislock-proof";
const GROUPS_CONTRACT = "thesislock-groups";

// Hiro caps the transactions endpoint at 50 results per call.
const HIRO_MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

export type ActivityType =
  | "anchor"
  | "batch-anchor"
  | "register"
  | "mint-proof"
  | "create-group"
  | "add-member"
  | "remove-member"
  | "group-anchor";

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  txId: string;
  blockHeight: number;
  timestamp: string;
  details: Record<string, unknown>;
  contractName: string;
};

// Broad categories used by the filter pills and the API `type` parameter.
export type ActivityCategory = "anchors" | "groups" | "proofs" | "registry";

export type ActivityPage = {
  events: ActivityEvent[];
  total: number;
  hasMore: boolean;
};

const CONTRACT_IDS = new Set([
  `${CONTRACT_ADDRESS}.${SINGLE_CONTRACT}`,
  `${CONTRACT_ADDRESS}.${BATCH_CONTRACT}`,
  `${CONTRACT_ADDRESS}.${REGISTRY_CONTRACT}`,
  `${CONTRACT_ADDRESS}.${PROOF_CONTRACT}`,
  `${CONTRACT_ADDRESS}.${GROUPS_CONTRACT}`,
]);

// Public function name to event type. Names are unique across the contracts, so
// the map alone is enough to both recognise and classify a call.
const FUNCTION_TYPES: Record<string, ActivityType> = {
  "anchor-document": "anchor",
  "anchor-batch": "batch-anchor",
  "register-anchor": "register",
  "mint-proof": "mint-proof",
  "create-group": "create-group",
  "add-member": "add-member",
  "remove-member": "remove-member",
  "anchor-to-group": "group-anchor",
};

// Maps each event type to the broad category the filter pills use.
export function activityCategory(type: ActivityType): ActivityCategory {
  switch (type) {
    case "anchor":
    case "batch-anchor":
      return "anchors";
    case "mint-proof":
      return "proofs";
    case "register":
      return "registry";
    default:
      return "groups";
  }
}

type AddressTx = {
  tx_id: string;
  tx_type: string;
  tx_status?: string;
  block_height?: number;
  tx_index?: number;
  burn_block_time?: number;
  block_time?: number;
  tx_result?: { hex?: string; repr?: string };
  contract_call?: {
    contract_id: string;
    function_name?: string;
    function_args?: Array<{ name?: string; hex?: string }>;
  };
};

type AddressTxResponse = {
  total?: number;
  results?: AddressTx[];
};

// cvToValue returns either a plain value or the verbose Clarity form
// ({ value: ... }) depending on the @stacks/transactions version, so peel a
// `value` wrapper when present.
function unwrap(v: unknown): unknown {
  if (v && typeof v === "object" && "value" in v) {
    return (v as { value: unknown }).value;
  }
  return v;
}

function stripHex(s: string): string {
  return s.startsWith("0x") ? s.slice(2) : s;
}

function decodeArg(tx: AddressTx, name: string): unknown {
  const arg = tx.contract_call?.function_args?.find((a) => a.name === name);
  if (!arg?.hex) return null;
  try {
    return cvToValue(deserializeCV(stripHex(arg.hex)), true);
  } catch {
    return null;
  }
}

function stringArg(tx: AddressTx, name: string): string {
  const v = unwrap(decodeArg(tx, name));
  return typeof v === "string" ? v : "";
}

function hashArg(tx: AddressTx, name = "hash"): string | null {
  const v = unwrap(decodeArg(tx, name));
  if (typeof v === "string" && v) return stripHex(v).toLowerCase();
  return null;
}

function numberArg(tx: AddressTx, name: string): number | null {
  const v = unwrap(decodeArg(tx, name));
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// The { hash, label } pairs submitted in an anchor-batch call, in list order.
// Both fields are decoded so consumers can attribute per-document labels to a
// batch, which the batch contract's own print event does not carry.
function batchEntries(tx: AddressTx): Array<{ hash: string; label: string }> {
  const value = decodeArg(tx, "entries");
  if (!Array.isArray(value)) return [];
  const entries: Array<{ hash: string; label: string }> = [];
  for (const entry of value) {
    const tuple = unwrap(entry);
    if (!tuple || typeof tuple !== "object") continue;
    const rec = tuple as Record<string, unknown>;
    const hash = unwrap(rec.hash);
    if (typeof hash !== "string" || !hash) continue;
    const label = unwrap(rec.label);
    entries.push({
      hash: stripHex(hash).toLowerCase(),
      label: typeof label === "string" ? label : "",
    });
  }
  return entries;
}

// A successful call returns (ok <value>); for the mint/batch/create paths that
// value is the new id, which the args don't carry. Pull it from the result.
function okUint(tx: AddressTx): number | null {
  const repr = tx.tx_result?.repr ?? "";
  const match = repr.match(/\(ok\s+u(\d+)\)/);
  return match ? Number(match[1]) : null;
}

function contractShortName(contractId: string): string {
  const dot = contractId.indexOf(".");
  return dot >= 0 ? contractId.slice(dot + 1) : contractId;
}

function txTimestamp(tx: AddressTx): string {
  const ts = tx.burn_block_time ?? tx.block_time ?? 0;
  return ts ? new Date(ts * 1000).toISOString() : "";
}

function toEvent(tx: AddressTx): ActivityEvent | null {
  const call = tx.contract_call;
  const fn = call?.function_name;
  if (!call || !fn) return null;
  const type = FUNCTION_TYPES[fn];
  if (!type) return null;

  const details: Record<string, unknown> = {};
  switch (type) {
    case "anchor":
    case "register": {
      details.hash = hashArg(tx);
      details.label = stringArg(tx, "label");
      break;
    }
    case "batch-anchor": {
      const entries = batchEntries(tx);
      details.count = entries.length;
      details.hash = entries[0]?.hash ?? null;
      details.entries = entries;
      details.batchId = okUint(tx);
      break;
    }
    case "mint-proof": {
      details.hash = hashArg(tx);
      details.label = stringArg(tx, "label");
      details.tokenId = okUint(tx);
      break;
    }
    case "create-group": {
      details.name = stringArg(tx, "name");
      details.groupId = okUint(tx);
      break;
    }
    case "add-member":
    case "remove-member": {
      details.groupId = numberArg(tx, "group-id");
      details.member = stringArg(tx, "member");
      break;
    }
    case "group-anchor": {
      details.groupId = numberArg(tx, "group-id");
      details.hash = hashArg(tx);
      details.label = stringArg(tx, "label");
      // anchor-to-group returns (ok <index>); capture it so links can address
      // the exact group anchor row.
      details.index = okUint(tx);
      break;
    }
  }

  return {
    id: tx.tx_id,
    type,
    txId: tx.tx_id,
    blockHeight: tx.block_height ?? 0,
    timestamp: txTimestamp(tx),
    details,
    contractName: contractShortName(call.contract_id),
  };
}

// Fetches one page of the wallet's ThesisLock activity, newest first. `page` is
// a zero-based index over the raw transaction stream, so `hasMore` reflects
// whether more transactions remain to page through (a filtered page may yield
// fewer events than the raw window, which is expected). `total` is the wallet's
// total transaction count as reported by Hiro.
export async function fetchActivityLog(
  address: string,
  page = 0,
  limit = DEFAULT_LIMIT,
): Promise<ActivityPage> {
  const safeLimit = Math.min(Math.max(1, limit), HIRO_MAX_LIMIT);
  const safePage = Math.max(0, page);
  const offset = safePage * safeLimit;

  const url = `${API_URL}/extended/v1/address/${address}/transactions?limit=${safeLimit}&offset=${offset}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Hiro tx fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as AddressTxResponse;
  const results = Array.isArray(data.results) ? data.results : [];

  const events = results
    // A reverted call (e.g. a duplicate anchor) is still listed but wrote
    // nothing on chain, so keep only successful ThesisLock contract calls.
    .filter(
      (tx) =>
        tx.tx_type === "contract_call" &&
        tx.tx_status === "success" &&
        tx.contract_call != null &&
        CONTRACT_IDS.has(tx.contract_call.contract_id),
    )
    .map(toEvent)
    .filter((e): e is ActivityEvent => e !== null);

  events.sort(
    (a, b) => b.blockHeight - a.blockHeight || b.txId.localeCompare(a.txId),
  );

  const total = typeof data.total === "number" ? data.total : offset + results.length;
  const hasMore = offset + results.length < total;

  return { events, total, hasMore };
}
