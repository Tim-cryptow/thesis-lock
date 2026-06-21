import { fetchEvents, fetchTxTimes, type RawEvent } from "./feed";
import {
  contractEventsToFeed,
  eventActor,
  type FeedEvent,
  type FeedOptions,
} from "./feedGenerator";

// Server-side data layer for the public feeds. Fetches recent print events from
// the protocol contracts, attaches each transaction's block time, filters and
// sorts, then converts to the shared FeedEvent shape. Shared by the RSS, Atom,
// and JSON Feed routes.

const SINGLE = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";

// The contracts whose events are surfaced in the feed. The registry is omitted
// because its registrations mirror single anchors.
const FEED_CONTRACTS = [
  SINGLE,
  "thesislock-batch",
  "thesislock-groups",
  "thesislock-proof",
];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
// Hiro caps the events endpoint at 50 per call.
const HIRO_MAX = 50;

export type FeedQuery = {
  contract: string | null;
  address: string | null;
  limit: number;
};

export function parseFeedQuery(url: URL): FeedQuery {
  const rawLimit = Number(url.searchParams.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  return {
    contract: url.searchParams.get("contract"),
    address: url.searchParams.get("address"),
    limit,
  };
}

export function buildFeedOptions(
  origin: string,
  feedUrl: string,
  query: FeedQuery,
): FeedOptions {
  const filters: string[] = [];
  if (query.contract) filters.push(`contract ${query.contract}`);
  if (query.address) filters.push(`wallet ${query.address}`);
  const suffix = filters.length ? ` (${filters.join(", ")})` : "";
  return {
    title: `ThesisLock protocol events${suffix}`,
    description:
      "Recent on-chain events from the ThesisLock contracts on Stacks: document anchors, batches, group anchors, and proof mints.",
    link: origin,
    feedUrl,
    language: "en",
  };
}

// Resolves a ?contract value (short like "batch" or full like
// "thesislock-batch") to the contracts to query.
function resolveContracts(contract: string | null): string[] {
  if (!contract) return FEED_CONTRACTS;
  const c = contract.toLowerCase();
  return FEED_CONTRACTS.filter(
    (name) => name === c || name.replace("thesislock-", "") === c,
  );
}

export async function fetchFeedEvents(query: FeedQuery): Promise<FeedEvent[]> {
  const contracts = resolveContracts(query.contract);
  if (contracts.length === 0) return [];

  // Each contract's events come back newest first; fetch a window at least as
  // large as the requested limit (capped at the Hiro per-call maximum).
  const perContract = Math.min(Math.max(query.limit, 20), HIRO_MAX);
  const lists = await Promise.all(
    contracts.map((name) =>
      fetchEvents(name, perContract, 0).catch(() => [] as RawEvent[]),
    ),
  );

  let raw: RawEvent[] = lists.flat();

  if (query.address) {
    const addr = query.address.toUpperCase();
    raw = raw.filter((ev) => (eventActor(ev) ?? "").toUpperCase() === addr);
  }

  const times = await fetchTxTimes(raw.map((ev) => ev.tx_id));
  const enriched = raw.map((ev) => ({
    ...ev,
    block_time: times.get(ev.tx_id) ?? 0,
  }));

  // Most recent first across all contracts, then trim to the requested count.
  enriched.sort((a, b) => (b.block_time ?? 0) - (a.block_time ?? 0));
  return contractEventsToFeed(enriched.slice(0, query.limit));
}
