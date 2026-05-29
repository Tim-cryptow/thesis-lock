const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hiro.so";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const SINGLE_CONTRACT = "thesislock";
const BATCH_CONTRACT = "thesislock-batch";
const REGISTRY_CONTRACT = "thesislock-registry";

const CACHE_TTL_MS = 5 * 60 * 1000;
const HIRO_PAGE = 50;
const MAX_PAGES = 10;

export type ProtocolStats = {
  totalAnchors: number;
  totalBatchAnchors: number;
  totalRegistrations: number;
  uniqueWallets: number;
  contractsDeployed: number;
  firstAnchorBlock: number;
  latestAnchorBlock: number;
  anchorsByDay: Array<{ date: string; count: number }>;
};

type AddressTx = {
  tx_id: string;
  tx_type: string;
  sender_address?: string;
  block_height?: number;
  burn_block_time?: number;
  block_time?: number;
  contract_call?: { contract_id: string; function_name?: string };
};

type AddressTxResponse = {
  total?: number;
  results?: AddressTx[];
};

const ZEROED_STATS: ProtocolStats = {
  totalAnchors: 0,
  totalBatchAnchors: 0,
  totalRegistrations: 0,
  uniqueWallets: 0,
  contractsDeployed: 3,
  firstAnchorBlock: 0,
  latestAnchorBlock: 0,
  anchorsByDay: [],
};

let cache: { data: ProtocolStats; expires: number } | null = null;

async function fetchContractCalls(contractName: string): Promise<AddressTx[]> {
  const contractId = `${CONTRACT_ADDRESS}.${contractName}`;
  const all: AddressTx[] = [];
  let offset = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = `${API_URL}/extended/v1/address/${contractId}/transactions?limit=${HIRO_PAGE}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Hiro tx fetch failed (${contractName}): ${res.status}`);
    }
    const data = (await res.json()) as AddressTxResponse;
    const results = Array.isArray(data.results) ? data.results : [];
    all.push(...results);
    if (results.length < HIRO_PAGE) break;
    offset += HIRO_PAGE;
    if (typeof data.total === "number" && offset >= data.total) break;
  }

  return all.filter(
    (tx) =>
      tx.tx_type === "contract_call" &&
      tx.contract_call?.contract_id === contractId,
  );
}

function txTimestamp(tx: AddressTx): number {
  return tx.burn_block_time ?? tx.block_time ?? 0;
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

  const anchorBlocks = single
    .map((tx) => tx.block_height ?? 0)
    .filter((block) => block > 0);
  const firstAnchorBlock = anchorBlocks.length ? Math.min(...anchorBlocks) : 0;
  const latestAnchorBlock = anchorBlocks.length ? Math.max(...anchorBlocks) : 0;

  const byDay = new Map<string, number>();
  for (const tx of everyCall) {
    const ts = txTimestamp(tx);
    if (!ts) continue;
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    byDay.set(date, (byDay.get(date) ?? 0) + 1);
  }
  const anchorsByDay = Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalAnchors: single.length,
    totalBatchAnchors: batch.length,
    totalRegistrations: registry.length,
    uniqueWallets: wallets.size,
    contractsDeployed: 3,
    firstAnchorBlock,
    latestAnchorBlock,
    anchorsByDay,
  };
}

export async function fetchProtocolStats(): Promise<ProtocolStats> {
  if (cache && Date.now() < cache.expires) return cache.data;
  try {
    const data = await computeStats();
    cache = { data, expires: Date.now() + CACHE_TTL_MS };
    return data;
  } catch {
    return ZEROED_STATS;
  }
}
