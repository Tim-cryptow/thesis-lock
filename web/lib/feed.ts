import { cvToValue, deserializeCV } from "@stacks/transactions";
import { readBatchAnchor, type BatchAnchor } from "./stacks";
import { getRecentAnchors } from "./anchorsIndex";
import { fetchWithRetry } from "./fetchWithRetry";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const SINGLE_CONTRACT = "thesislock";
const BATCH_CONTRACT = "thesislock-batch";
const REGISTRY_CONTRACT = "thesislock-registry";

export type FeedSource = "single" | "batch" | "registry";

export type FeedEntry = {
  hash: string;
  label: string;
  owner: string;
  stacksBlock: number;
  timestamp: string;
  txId: string;
  source: FeedSource;
};

type RawEvent = {
  tx_id: string;
  event_type: string;
  contract_log?: {
    contract_id: string;
    topic: string;
    value: { hex: string; repr: string };
  };
};

export type { RawEvent };

type EventsResponse = {
  limit: number;
  offset: number;
  total?: number;
  results: RawEvent[];
};

export async function fetchEvents(
  contractName: string,
  limit: number,
  offset: number,
): Promise<RawEvent[]> {
  const url = `${API_URL}/extended/v1/contract/${CONTRACT_ADDRESS}.${contractName}/events?limit=${limit}&offset=${offset}`;
  const res = await fetchWithRetry(url);
  if (!res.ok) {
    throw new Error(`Hiro events fetch failed (${contractName}): ${res.status}`);
  }
  const data = (await res.json()) as EventsResponse;
  return Array.isArray(data.results) ? data.results : [];
}

function stripHex(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function asNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v);
  return 0;
}

function decodePrintTuple(hex: string): Record<string, unknown> | null {
  if (!hex) return null;
  try {
    const cv = deserializeCV(stripHex(hex));
    const value = cvToValue(cv, true);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function parseSingleEvent(ev: RawEvent): FeedEntry | null {
  const tuple = decodePrintTuple(ev.contract_log?.value?.hex ?? "");
  if (!tuple || tuple["event"] !== "anchor-created") return null;
  const hash = stripHex(String(tuple["hash"] ?? "")).toLowerCase();
  if (!hash) return null;
  return {
    hash,
    label: String(tuple["label"] ?? ""),
    owner: String(tuple["anchored-by"] ?? ""),
    stacksBlock: asNumber(tuple["stacks-block"]),
    timestamp: "",
    txId: ev.tx_id,
    source: "single",
  };
}

function parseRegistryEvent(ev: RawEvent): FeedEntry | null {
  const tuple = decodePrintTuple(ev.contract_log?.value?.hex ?? "");
  if (!tuple || tuple["event"] !== "anchor-registered") return null;
  const hash = stripHex(String(tuple["hash"] ?? "")).toLowerCase();
  if (!hash) return null;
  return {
    hash,
    label: String(tuple["label"] ?? ""),
    owner: String(tuple["owner"] ?? ""),
    stacksBlock: asNumber(tuple["anchored-at"]),
    timestamp: "",
    txId: ev.tx_id,
    source: "registry",
  };
}

export async function fetchTxTimes(txIds: string[]): Promise<Map<string, number>> {
  const unique = Array.from(new Set(txIds));
  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        const res = await fetchWithRetry(`${API_URL}/extended/v1/tx/${id}`);
        if (!res.ok) return [id, 0] as const;
        const data = (await res.json()) as {
          burn_block_time?: number;
          block_time?: number;
        };
        const t = data.burn_block_time ?? data.block_time ?? 0;
        return [id, Number(t) || 0] as const;
      } catch {
        return [id, 0] as const;
      }
    }),
  );
  return new Map(results);
}

// Hiro caps `limit` at 50 per call. Page through a contract's events until
// we have at least `target` raw events or the source is exhausted. The
// per-call cap is also why the public `fetchRecentAnchors` always starts
// at offset 0 and refetches from scratch on Load more — a client offset
// cursor over a merged stream would skip valid entries from the quieter
// contract whenever the busier one paged past it.
const HIRO_PAGE = 50;
const PAGINATE_SAFETY_CAP = 500;

export async function paginatedFetch(contractName: string, target: number): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  let offset = 0;
  while (events.length < target) {
    const fetched = await fetchEvents(contractName, HIRO_PAGE, offset);
    events.push(...fetched);
    if (fetched.length < HIRO_PAGE) break;
    offset += HIRO_PAGE;
    if (offset >= PAGINATE_SAFETY_CAP) break;
  }
  return events;
}

export async function fetchRecentAnchors(limit = 20): Promise<FeedEntry[]> {
  // Errors propagate. The client distinguishes "no anchors yet" (empty
  // array from a successful fetch) from "fetch failed" so a transient
  // Hiro 5xx during the auto-refresh doesn't wipe the displayed list.
  // Overfetch raw events so dedupe + registry validation still leave
  // enough material for `limit` distinct, on-chain-backed entries.
  const target = Math.max(HIRO_PAGE, limit * 3);

  // Single anchors come from the Supabase index. On an index outage
  // getRecentAnchors returns null and we page the single contract's events from
  // Hiro instead, so the feed never goes empty. thesislock-batch is fetched for
  // spec parity (its print events carry only per-batch metadata, no hashes);
  // per-hash batch rows are surfaced via the registry contract.
  const indexedSingles = await getRecentAnchors(target);
  const [, registryEvents, fallbackSingleEvents] = await Promise.all([
    paginatedFetch(BATCH_CONTRACT, target),
    paginatedFetch(REGISTRY_CONTRACT, target),
    indexedSingles === null
      ? paginatedFetch(SINGLE_CONTRACT, target)
      : Promise.resolve([] as RawEvent[]),
  ]);

  const partials: FeedEntry[] = [];
  if (indexedSingles !== null) {
    for (const a of indexedSingles) {
      partials.push({
        hash: a.hash,
        label: a.label,
        owner: a.anchoredBy,
        stacksBlock: a.stacksBlock,
        timestamp: "",
        txId: a.txId,
        source: "single",
      });
    }
  } else {
    for (const ev of fallbackSingleEvents) {
      const p = parseSingleEvent(ev);
      if (p) partials.push(p);
    }
  }
  for (const ev of registryEvents) {
    const p = parseRegistryEvent(ev);
    if (p) partials.push(p);
  }

  // Dedupe by (hash, owner). Single contract wins over registry: it is
  // authoritative for single-anchor flows and identifies them by source.
  const dedup = new Map<string, FeedEntry>();
  for (const p of partials) {
    const key = `${p.hash}|${p.owner}`;
    const existing = dedup.get(key);
    if (!existing) {
      dedup.set(key, p);
    } else if (p.source === "single" && existing.source !== "single") {
      dedup.set(key, p);
    }
  }

  const singleEntries: FeedEntry[] = [];
  const registryOnly: FeedEntry[] = [];
  for (const entry of dedup.values()) {
    if (entry.source === "single") singleEntries.push(entry);
    else registryOnly.push(entry);
  }

  // The registry contract doesn't validate that the hash actually exists
  // in thesislock-batch — anyone can call register-anchor with arbitrary
  // data. Confirm each registry-only entry against the batch map; drop
  // entries that resolve to (none), and use the batch record's
  // authoritative stacks-block for the rest. Errors are not caught here:
  // a transient Hiro failure would otherwise silently drop every batch
  // row instead of surfacing as a feed-level error in the client.
  const validated = await Promise.all(
    registryOnly.map(async (entry): Promise<FeedEntry | null> => {
      const batch: BatchAnchor | null = await readBatchAnchor(entry.hash, entry.owner);
      if (!batch) return null;
      return {
        ...entry,
        source: "batch",
        stacksBlock: batch.stacksBlock,
        label: batch.label || entry.label,
      };
    }),
  );

  const merged: FeedEntry[] = [
    ...singleEntries,
    ...validated.filter((e): e is FeedEntry => e !== null),
  ];
  merged.sort((a, b) => b.stacksBlock - a.stacksBlock);
  const top = merged.slice(0, limit);

  if (top.length === 0) return [];

  const txTimes = await fetchTxTimes(top.map((e) => e.txId));
  return top.map((e) => {
    const t = txTimes.get(e.txId) ?? 0;
    return {
      ...e,
      timestamp: t ? new Date(t * 1000).toISOString() : "",
    };
  });
}
