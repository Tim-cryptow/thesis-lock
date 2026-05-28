import { cvToValue, deserializeCV } from "@stacks/transactions";

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

type EventsResponse = {
  limit: number;
  offset: number;
  total?: number;
  results: RawEvent[];
};

async function fetchEvents(
  contractName: string,
  limit: number,
  offset: number,
): Promise<RawEvent[]> {
  const url = `${API_URL}/extended/v1/contract/${CONTRACT_ADDRESS}.${contractName}/events?limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
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

async function fetchTxTimes(txIds: string[]): Promise<Map<string, number>> {
  const unique = Array.from(new Set(txIds));
  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        const res = await fetch(`${API_URL}/extended/v1/tx/${id}`);
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

export async function fetchRecentAnchors(
  limit = 20,
  offset = 0,
): Promise<FeedEntry[]> {
  try {
    // Hiro caps per-page at 50 events. Overfetch (capped at 50) so the
    // dedupe step still leaves room for `limit` distinct entries on a
    // single page.
    const rawLimit = Math.min(50, Math.max(20, limit * 3));

    // thesislock-batch is fetched for spec parity, but its print events
    // carry only per-batch metadata (no hashes). The per-hash batch rows
    // are surfaced via the registry contract, which is called per entry.
    const [singleEvents, , registryEvents] = await Promise.all([
      fetchEvents(SINGLE_CONTRACT, rawLimit, offset),
      fetchEvents(BATCH_CONTRACT, rawLimit, offset),
      fetchEvents(REGISTRY_CONTRACT, rawLimit, offset),
    ]);

    const partials: FeedEntry[] = [];
    for (const ev of singleEvents) {
      const p = parseSingleEvent(ev);
      if (p) partials.push(p);
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

    // A registry entry without a matching single record came from a batch
    // anchor (the registry is the only contract that exposes per-hash data
    // for batch entries). Promote those to source: "batch".
    const merged = Array.from(dedup.values()).map((e) =>
      e.source === "registry" ? { ...e, source: "batch" as FeedSource } : e,
    );

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
  } catch (e) {
    console.error("fetchRecentAnchors failed", e);
    return [];
  }
}
