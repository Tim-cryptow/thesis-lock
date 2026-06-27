import { fetchEvents, fetchTxTimes, type RawEvent } from "./feed";
import {
  contractEventsToFeed,
  eventActor,
  isFeedEvent,
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
const FEED_CONTRACTS = [SINGLE, "thesislock-batch", "thesislock-groups", "thesislock-proof"];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
// Hiro caps a single events call at 50. Page up to this offset so a contract
// that emits non-feed events (a proof mint emits an NFT event plus its print)
// can still yield enough surfaced events to fill the requested limit.
const HIRO_PAGE = 50;
const OFFSET_CAP = 500;

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

export function buildFeedOptions(origin: string, feedUrl: string, query: FeedQuery): FeedOptions {
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
  return FEED_CONTRACTS.filter((name) => name === c || name.replace("thesislock-", "") === c);
}

// Pages a contract's events (newest first) until it has collected at least
// `needed` surfaced (mappable) events or the source is exhausted, so non-feed
// rows like NFT mint events do not starve the result. When `matches` is given
// (an address filter), only matching surfaced events count toward `needed`, so a
// wallet whose events sit in later pages is not cut off.
async function collectContractRaw(
  name: string,
  needed: number,
  matches?: (ev: RawEvent) => boolean,
): Promise<RawEvent[]> {
  const collected: RawEvent[] = [];
  let counted = 0;
  for (let offset = 0; offset < OFFSET_CAP; offset += HIRO_PAGE) {
    let page: RawEvent[];
    try {
      page = await fetchEvents(name, HIRO_PAGE, offset);
    } catch {
      break;
    }
    if (page.length === 0) break;
    collected.push(...page);
    for (const ev of page) {
      if (!isFeedEvent(ev)) continue;
      if (matches && !matches(ev)) continue;
      counted += 1;
    }
    if (page.length < HIRO_PAGE || counted >= needed) break;
  }
  return collected;
}

export async function fetchFeedEvents(query: FeedQuery): Promise<FeedEvent[]> {
  const contracts = resolveContracts(query.contract);
  if (contracts.length === 0) return [];

  const target = Math.max(query.limit, 20);
  const addr = query.address ? query.address.toUpperCase() : null;
  const matches = addr
    ? (ev: RawEvent) => (eventActor(ev) ?? "").toUpperCase() === addr
    : undefined;
  const lists = await Promise.all(
    contracts.map((name) => collectContractRaw(name, target, matches)),
  );

  let raw: RawEvent[] = lists.flat();

  if (addr) {
    raw = raw.filter((ev) => (eventActor(ev) ?? "").toUpperCase() === addr);
  }

  const times = await fetchTxTimes(raw.map((ev) => ev.tx_id));
  const enriched = raw.map((ev) => ({
    ...ev,
    block_time: times.get(ev.tx_id) ?? 0,
  }));

  // Map to feed events first so non-feed rows do not consume slots, then take
  // the most recent across all contracts up to the requested count.
  const events = contractEventsToFeed(enriched);
  events.sort((a, b) => (b.pubDate || "").localeCompare(a.pubDate || ""));
  return events.slice(0, query.limit);
}
