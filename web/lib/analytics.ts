import { cvToValue, deserializeCV } from "@stacks/transactions";
import { fetchWithRetry } from "./fetchWithRetry";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hiro.so";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const SINGLE_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";
const BATCH_CONTRACT = "thesislock-batch";
const GROUPS_CONTRACT = "thesislock-groups";
const PROOF_CONTRACT = "thesislock-proof";

const CACHE_TTL_MS = 2 * 60 * 1000;
const HIRO_PAGE = 50;
// A single anchoring wallet should never approach this many calls; the cap
// just stops a runaway loop if Hiro keeps reporting more pages.
const MAX_PAGES = 40;

export type AnchorSource = "single" | "batch" | "group";

// Each day carries the per-source split so the chart can stack and color the
// bars, while `count` stays as the documented total for that day.
export type DayActivity = {
  date: string;
  count: number;
  single: number;
  batch: number;
  group: number;
};

export type ActivityItem = {
  txId: string;
  kind: AnchorSource | "proof";
  action: string;
  // The hash a row links to under /v/<hash>. A batch links to its first entry;
  // null only when the call carried no decodable hash.
  hash: string | null;
  groupId: number | null;
  block: number;
  timestamp: string;
};

export type WalletAnalytics = {
  totalAnchors: number;
  anchorsBySource: { single: number; batch: number; group: number };
  anchorsByDay: DayActivity[];
  firstAnchorBlock: number;
  latestAnchorBlock: number;
  totalBatches: number;
  totalGroups: number;
  proofNFTsMinted: number;
  recentActivity: ActivityItem[];
};

type AddressTx = {
  tx_id: string;
  tx_type: string;
  tx_status?: string;
  sender_address?: string;
  block_height?: number;
  tx_index?: number;
  burn_block_time?: number;
  block_time?: number;
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

const cache = new Map<string, { data: WalletAnalytics; expires: number }>();

const SINGLE_ID = `${CONTRACT_ADDRESS}.${SINGLE_CONTRACT}`;
const BATCH_ID = `${CONTRACT_ADDRESS}.${BATCH_CONTRACT}`;
const GROUPS_ID = `${CONTRACT_ADDRESS}.${GROUPS_CONTRACT}`;
const PROOF_ID = `${CONTRACT_ADDRESS}.${PROOF_CONTRACT}`;
const CONTRACT_IDS = new Set([SINGLE_ID, BATCH_ID, GROUPS_ID, PROOF_ID]);

async function fetchWalletTxs(address: string): Promise<AddressTx[]> {
  const all: AddressTx[] = [];
  let offset = 0;
  let total = Infinity;
  let page = 0;

  while (offset < total && page < MAX_PAGES) {
    const url = `${API_URL}/extended/v1/address/${address}/transactions?limit=${HIRO_PAGE}&offset=${offset}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      throw new Error(`Hiro tx fetch failed: ${res.status}`);
    }
    const data = (await res.json()) as AddressTxResponse;
    const results = Array.isArray(data.results) ? data.results : [];
    all.push(...results);
    if (typeof data.total === "number") total = data.total;
    if (results.length < HIRO_PAGE) break;
    offset += HIRO_PAGE;
    page += 1;
  }

  // A reverted call (e.g. a duplicate anchor) is still listed but wrote nothing
  // on chain, so keep only successful calls to the ThesisLock contracts.
  return all.filter(
    (tx) =>
      tx.tx_type === "contract_call" &&
      tx.tx_status === "success" &&
      tx.contract_call != null &&
      CONTRACT_IDS.has(tx.contract_call.contract_id),
  );
}

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
    const hex = arg.hex.startsWith("0x") ? arg.hex.slice(2) : arg.hex;
    return cvToValue(deserializeCV(hex), true);
  } catch {
    return null;
  }
}

function hashArg(tx: AddressTx, name = "hash"): string | null {
  const v = unwrap(decodeArg(tx, name));
  if (typeof v === "string" && v) return stripHex(v).toLowerCase();
  return null;
}

function groupIdArg(tx: AddressTx): number | null {
  const v = unwrap(decodeArg(tx, "group-id"));
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// The document hashes submitted in an anchor-batch call, in list order.
function batchEntryHashes(tx: AddressTx): string[] {
  const value = decodeArg(tx, "entries");
  if (!Array.isArray(value)) return [];
  const hashes: string[] = [];
  for (const entry of value) {
    const tuple = unwrap(entry);
    if (!tuple || typeof tuple !== "object") continue;
    const hash = unwrap((tuple as Record<string, unknown>).hash);
    if (typeof hash === "string" && hash) hashes.push(stripHex(hash).toLowerCase());
  }
  return hashes;
}

function txTimestamp(tx: AddressTx): number {
  return tx.burn_block_time ?? tx.block_time ?? 0;
}

function txDay(tx: AddressTx): string | null {
  const ts = txTimestamp(tx);
  if (!ts) return null;
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

async function computeAnalytics(address: string): Promise<WalletAnalytics> {
  const txs = await fetchWalletTxs(address);

  const byDay = new Map<string, DayActivity>();
  const addDay = (date: string | null, source: AnchorSource, weight: number) => {
    if (!date || weight <= 0) return;
    const day = byDay.get(date) ?? {
      date,
      count: 0,
      single: 0,
      batch: 0,
      group: 0,
    };
    day[source] += weight;
    day.count += weight;
    byDay.set(date, day);
  };

  let singleAnchors = 0;
  let batchAnchors = 0;
  let groupAnchors = 0;
  let totalBatches = 0;
  let proofNFTsMinted = 0;
  const groupIds = new Set<number>();
  // A batch silently skips a hash this wallet already anchored, so count each
  // distinct hash once across all of the wallet's batches.
  const batchedHashes = new Set<string>();
  const anchorBlocks: number[] = [];

  // Replay in chain order so batch dedup matches what was actually written.
  const ordered = [...txs].sort(
    (a, b) =>
      (a.block_height ?? 0) - (b.block_height ?? 0) || (a.tx_index ?? 0) - (b.tx_index ?? 0),
  );

  for (const tx of ordered) {
    const fn = tx.contract_call?.function_name;
    const id = tx.contract_call?.contract_id;
    const block = tx.block_height ?? 0;

    if (id === SINGLE_ID && fn === "anchor-document") {
      singleAnchors += 1;
      addDay(txDay(tx), "single", 1);
      if (block > 0) anchorBlocks.push(block);
    } else if (id === BATCH_ID && fn === "anchor-batch") {
      totalBatches += 1;
      let newRows = 0;
      for (const hash of batchEntryHashes(tx)) {
        if (batchedHashes.has(hash)) continue;
        batchedHashes.add(hash);
        newRows += 1;
      }
      batchAnchors += newRows;
      addDay(txDay(tx), "batch", newRows);
      if (block > 0 && newRows > 0) anchorBlocks.push(block);
    } else if (id === GROUPS_ID && fn === "anchor-to-group") {
      groupAnchors += 1;
      const gid = groupIdArg(tx);
      if (gid !== null) groupIds.add(gid);
      addDay(txDay(tx), "group", 1);
      if (block > 0) anchorBlocks.push(block);
    } else if (id === PROOF_ID && fn === "mint-proof") {
      proofNFTsMinted += 1;
    }
  }

  const recentActivity = buildRecentActivity(ordered);

  const anchorsByDay = Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalAnchors: singleAnchors + batchAnchors + groupAnchors,
    anchorsBySource: {
      single: singleAnchors,
      batch: batchAnchors,
      group: groupAnchors,
    },
    anchorsByDay,
    firstAnchorBlock: anchorBlocks.length ? Math.min(...anchorBlocks) : 0,
    latestAnchorBlock: anchorBlocks.length ? Math.max(...anchorBlocks) : 0,
    totalBatches,
    totalGroups: groupIds.size,
    proofNFTsMinted,
    recentActivity,
  };
}

function buildRecentActivity(orderedAsc: AddressTx[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  // orderedAsc is chain-ascending; walk newest first for the feed.
  for (let i = orderedAsc.length - 1; i >= 0 && items.length < 20; i -= 1) {
    const tx = orderedAsc[i]!;
    const fn = tx.contract_call?.function_name;
    const id = tx.contract_call?.contract_id;
    const block = tx.block_height ?? 0;
    const timestamp = txTimestamp(tx) ? new Date(txTimestamp(tx) * 1000).toISOString() : "";

    if (id === SINGLE_ID && fn === "anchor-document") {
      items.push({
        txId: tx.tx_id,
        kind: "single",
        action: "Anchored",
        hash: hashArg(tx),
        groupId: null,
        block,
        timestamp,
      });
    } else if (id === BATCH_ID && fn === "anchor-batch") {
      const hashes = batchEntryHashes(tx);
      items.push({
        txId: tx.tx_id,
        kind: "batch",
        action:
          hashes.length === 1 ? "Batch anchored 1 file" : `Batch anchored ${hashes.length} files`,
        hash: hashes[0] ?? null,
        groupId: null,
        block,
        timestamp,
      });
    } else if (id === GROUPS_ID && fn === "anchor-to-group") {
      const gid = groupIdArg(tx);
      items.push({
        txId: tx.tx_id,
        kind: "group",
        action: gid !== null ? `Anchored to Group ${gid}` : "Anchored to group",
        hash: hashArg(tx),
        groupId: gid,
        block,
        timestamp,
      });
    } else if (id === PROOF_ID && fn === "mint-proof") {
      items.push({
        txId: tx.tx_id,
        kind: "proof",
        action: "Minted proof NFT",
        hash: hashArg(tx),
        groupId: null,
        block,
        timestamp,
      });
    }
  }
  return items;
}

export async function fetchWalletAnalytics(address: string): Promise<WalletAnalytics> {
  const cached = cache.get(address);
  if (cached && Date.now() < cached.expires) return cached.data;
  const data = await computeAnalytics(address);
  cache.set(address, { data, expires: Date.now() + CACHE_TTL_MS });
  return data;
}
