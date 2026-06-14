import { cvToValue, deserializeCV } from "@stacks/transactions";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hiro.so";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const SINGLE_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";
const BATCH_CONTRACT = "thesislock-batch";
const REGISTRY_CONTRACT = "thesislock-registry";

const CACHE_TTL_MS = 5 * 60 * 1000;
const HIRO_PAGE = 50;

export type ProtocolStats = {
  totalAnchors: number;
  totalBatchAnchors: number;
  totalRegistrations: number;
  totalTransactions: number;
  uniqueWallets: number;
  contractsDeployed: number;
  firstAnchorBlock: number;
  latestAnchorBlock: number;
  anchorsByDay: Array<{ date: string; count: number }>;
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

let cache: { data: ProtocolStats; expires: number } | null = null;

async function fetchContractCalls(contractName: string): Promise<AddressTx[]> {
  const contractId = `${CONTRACT_ADDRESS}.${contractName}`;
  const all: AddressTx[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const url = `${API_URL}/extended/v1/address/${contractId}/transactions?limit=${HIRO_PAGE}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Hiro tx fetch failed (${contractName}): ${res.status}`);
    }
    const data = (await res.json()) as AddressTxResponse;
    const results = Array.isArray(data.results) ? data.results : [];
    all.push(...results);
    if (typeof data.total === "number") total = data.total;
    if (results.length < HIRO_PAGE) break;
    offset += HIRO_PAGE;
  }

  // A reverted call (e.g. ERR-ALREADY-ANCHORED on a duplicate) is still listed
  // as a contract_call but wrote nothing on chain, so only successful txs count.
  return all.filter(
    (tx) =>
      tx.tx_type === "contract_call" &&
      tx.tx_status === "success" &&
      tx.contract_call?.contract_id === contractId,
  );
}

function txTimestamp(tx: AddressTx): number {
  return tx.burn_block_time ?? tx.block_time ?? 0;
}

// cvToValue returns either a plain tuple ({ hash: "0x.." }) or the verbose
// Clarity form ({ value: { hash: { value: "0x.." } } }) depending on the
// @stacks/transactions version, so peel a `value` wrapper when present.
function unwrap(v: unknown): unknown {
  if (v && typeof v === "object" && "value" in v) {
    return (v as { value: unknown }).value;
  }
  return v;
}

// The document hashes submitted in an anchor-batch call, in list order.
function batchEntryHashes(tx: AddressTx): string[] {
  const arg = tx.contract_call?.function_args?.find((a) => a.name === "entries");
  if (!arg?.hex) return [];
  try {
    const hex = arg.hex.startsWith("0x") ? arg.hex.slice(2) : arg.hex;
    const value = cvToValue(deserializeCV(hex), true);
    if (!Array.isArray(value)) return [];
    const hashes: string[] = [];
    for (const entry of value) {
      const tuple = unwrap(entry);
      if (!tuple || typeof tuple !== "object") continue;
      const hash = unwrap((tuple as Record<string, unknown>).hash);
      if (typeof hash === "string" && hash) hashes.push(hash.toLowerCase());
    }
    return hashes;
  } catch {
    return [];
  }
}

function txDay(tx: AddressTx): string | null {
  const ts = txTimestamp(tx);
  if (!ts) return null;
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

async function computeStats(): Promise<ProtocolStats> {
  const [single, batch, registry] = await Promise.all([
    fetchContractCalls(SINGLE_CONTRACT),
    fetchContractCalls(BATCH_CONTRACT),
    fetchContractCalls(REGISTRY_CONTRACT),
  ]);

  const everyCall = [...single, ...batch, ...registry];

  const wallets = new Set<string>();
  for (const tx of everyCall) {
    if (tx.sender_address) wallets.add(tx.sender_address);
  }

  const anchorBlocks = everyCall
    .map((tx) => tx.block_height ?? 0)
    .filter((block) => block > 0);
  const firstAnchorBlock = anchorBlocks.length ? Math.min(...anchorBlocks) : 0;
  const latestAnchorBlock = anchorBlocks.length ? Math.max(...anchorBlocks) : 0;

  const byDay = new Map<string, number>();
  const addDay = (date: string | null, weight: number) => {
    if (!date || weight <= 0) return;
    byDay.set(date, (byDay.get(date) ?? 0) + weight);
  };

  // The chart counts anchored documents, so it tracks single and batch
  // anchors only. Registry calls re-index an already-anchored file (the UI
  // anchors then registers), so counting them here would double the per-day
  // total against totalAnchors.
  for (const tx of single) addDay(txDay(tx), 1);

  // The batch contract keys rows by {hash, owner} and inserts with map-insert,
  // which silently skips a pair the owner already anchored in this or an
  // earlier batch. Replay batches in chain order, count each {hash, owner}
  // once on the day it was first written, so totals and the chart reflect rows
  // actually written rather than entries submitted.
  const writtenPairs = new Set<string>();
  const orderedBatch = [...batch].sort(
    (a, b) =>
      (a.block_height ?? 0) - (b.block_height ?? 0) ||
      (a.tx_index ?? 0) - (b.tx_index ?? 0),
  );
  let batchAnchors = 0;
  for (const tx of orderedBatch) {
    const owner = tx.sender_address ?? "";
    let newRows = 0;
    for (const hash of batchEntryHashes(tx)) {
      const key = `${hash}|${owner}`;
      if (writtenPairs.has(key)) continue;
      writtenPairs.add(key);
      newRows += 1;
    }
    batchAnchors += newRows;
    addDay(txDay(tx), newRows);
  }

  const anchorsByDay = Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalAnchors: single.length + batchAnchors,
    totalBatchAnchors: batchAnchors,
    totalRegistrations: registry.length,
    totalTransactions: single.length + batch.length + registry.length,
    uniqueWallets: wallets.size,
    contractsDeployed: 3,
    firstAnchorBlock,
    latestAnchorBlock,
    anchorsByDay,
  };
}

export async function fetchProtocolStats(): Promise<ProtocolStats> {
  if (cache && Date.now() < cache.expires) return cache.data;
  // Errors propagate so the route can return a failure status and the client
  // shows its error state instead of zeroed stats that read as "no activity".
  const data = await computeStats();
  cache = { data, expires: Date.now() + CACHE_TTL_MS };
  return data;
}
