import { cvToValue, deserializeCV } from "@stacks/transactions";
import {
  getProofByHash,
  getRecentAnchors,
  readAnchor,
  readBatchAnchor,
} from "./stacks";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const SINGLE_CONTRACT = "thesislock";
const BATCH_CONTRACT = "thesislock-batch";
const REGISTRY_CONTRACT = "thesislock-registry";
const PROOF_CONTRACT = "thesislock-proof";
const GROUPS_CONTRACT = "thesislock-groups";

export type SearchSource = "single" | "batch" | "registry" | "proof" | "group";

export type SearchResult = {
  hash: string;
  label: string;
  owner: string;
  stacksBlock: number;
  source: SearchSource;
  groupId?: number;
  verifyUrl: string;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

export type SearchType = "auto" | "hash" | "principal" | "label";

function stripHex(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function asNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return Number(v);
  return 0;
}

// Owner-keyed sources (batch, group) are only publicly resolvable on the verify
// page when the owner principal travels with the link; single and proof anchors
// are keyed by hash alone.
function buildVerifyUrl(
  hash: string,
  source: SearchSource,
  owner: string,
): string {
  const base = `/v/${hash}`;
  const ownerKeyed =
    source === "batch" || source === "group" || source === "registry";
  if (ownerKeyed && STX_PRINCIPAL.test(owner)) {
    return `${base}?owner=${owner}`;
  }
  return base;
}

// Decide which kind of query a free-text term is when type is "auto".
export function detectSearchType(query: string): Exclude<SearchType, "auto"> {
  const trimmed = query.trim();
  if (HEX_64.test(trimmed.toLowerCase())) return "hash";
  if (STX_PRINCIPAL.test(trimmed.toUpperCase())) return "principal";
  return "label";
}

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
  results?: RawEvent[];
};

const HIRO_PAGE = 50;
// Hard guard against a runaway loop only. It is set far above any realistic
// per-contract event count so searches page to true exhaustion rather than
// silently dropping anchors older than a fixed window.
const HARD_OFFSET_CAP = 50_000;

async function fetchEventsPage(
  contractName: string,
  offset: number,
): Promise<RawEvent[]> {
  const url = `${API_URL}/extended/v1/contract/${CONTRACT_ADDRESS}.${contractName}/events?limit=${HIRO_PAGE}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Hiro events fetch failed (${contractName}): ${res.status}`);
  }
  const data = (await res.json()) as EventsResponse;
  return Array.isArray(data.results) ? data.results : [];
}

// Page through all of a contract's print events. Hiro returns events
// newest-first and caps `limit` at 50 per call, so we follow offsets until a
// short page signals exhaustion. Stopping early would hide older anchors from
// label, principal, and group-hash searches.
async function fetchAllEvents(contractName: string): Promise<RawEvent[]> {
  const events: RawEvent[] = [];
  let offset = 0;
  while (offset < HARD_OFFSET_CAP) {
    const page = await fetchEventsPage(contractName, offset);
    events.push(...page);
    if (page.length < HIRO_PAGE) break;
    offset += HIRO_PAGE;
  }
  return events;
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

type ParsedEvent = {
  event: string;
  hash: string;
  label: string;
  owner: string;
  stacksBlock: number;
  groupId?: number;
};

// Normalize a single-contract, registry, or groups print event into a common
// shape. Returns null for unrelated topics (or batch-anchored events, which
// carry only per-batch metadata and no per-hash hash).
function parseEvent(ev: RawEvent): ParsedEvent | null {
  const tuple = decodePrintTuple(ev.contract_log?.value?.hex ?? "");
  if (!tuple) return null;
  const event = String(tuple["event"] ?? "");

  if (event === "anchor-created") {
    const hash = stripHex(String(tuple["hash"] ?? "")).toLowerCase();
    if (!hash) return null;
    return {
      event,
      hash,
      label: String(tuple["label"] ?? ""),
      owner: String(tuple["anchored-by"] ?? ""),
      stacksBlock: asNumber(tuple["stacks-block"]),
    };
  }

  if (event === "anchor-registered") {
    const hash = stripHex(String(tuple["hash"] ?? "")).toLowerCase();
    if (!hash) return null;
    return {
      event,
      hash,
      label: String(tuple["label"] ?? ""),
      owner: String(tuple["owner"] ?? ""),
      stacksBlock: asNumber(tuple["anchored-at"]),
    };
  }

  if (event === "group-anchor-added") {
    const hash = stripHex(String(tuple["hash"] ?? "")).toLowerCase();
    if (!hash) return null;
    return {
      event,
      hash,
      label: String(tuple["label"] ?? ""),
      owner: String(tuple["anchored-by"] ?? ""),
      stacksBlock: asNumber(tuple["stacks-block"]),
      groupId: asNumber(tuple["group-id"]),
    };
  }

  if (event === "proof-minted") {
    const hash = stripHex(String(tuple["hash"] ?? "")).toLowerCase();
    if (!hash) return null;
    return {
      event,
      hash,
      label: "",
      owner: String(tuple["anchored-by"] ?? ""),
      stacksBlock: asNumber(tuple["stacks-block"]),
    };
  }

  return null;
}

function sourceForEvent(event: string): SearchSource {
  switch (event) {
    case "anchor-created":
      return "single";
    case "anchor-registered":
      return "registry";
    case "group-anchor-added":
      return "group";
    case "proof-minted":
      return "proof";
    default:
      return "single";
  }
}

function toResult(parsed: ParsedEvent): SearchResult {
  const source = sourceForEvent(parsed.event);
  return {
    hash: parsed.hash,
    label: parsed.label,
    owner: parsed.owner,
    stacksBlock: parsed.stacksBlock,
    source,
    ...(parsed.groupId !== undefined ? { groupId: parsed.groupId } : {}),
    verifyUrl: buildVerifyUrl(parsed.hash, source, parsed.owner),
  };
}

function dedupeKey(r: SearchResult): string {
  return `${r.source}|${r.hash}|${r.owner}|${r.groupId ?? ""}`;
}

function dedupe(results: SearchResult[]): SearchResult[] {
  const map = new Map<string, SearchResult>();
  for (const r of results) {
    const key = dedupeKey(r);
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
}

// Look up an exact 64-hex hash across every contract. The batch contract is
// keyed by { hash, owner }, so its owners are discovered from the registry's
// anchor-registered events (every batch entry is also registered there) and
// then confirmed against the batch map. An explicit owner is always checked too.
export async function searchByHash(
  hash: string,
  owner?: string,
): Promise<SearchResult[]> {
  const normalized = stripHex(hash).toLowerCase();
  if (!HEX_64.test(normalized)) return [];

  const results: SearchResult[] = [];

  const [single, proof, groupEvents, registryEvents] = await Promise.all([
    readAnchor(normalized).catch(() => null),
    getProofByHash(normalized).catch(() => null),
    fetchAllEvents(GROUPS_CONTRACT).catch(() => [] as RawEvent[]),
    fetchAllEvents(REGISTRY_CONTRACT).catch(() => [] as RawEvent[]),
  ]);

  if (single) {
    results.push({
      hash: normalized,
      label: single.label,
      owner: single.anchoredBy,
      stacksBlock: single.stacksBlock,
      source: "single",
      verifyUrl: buildVerifyUrl(normalized, "single", single.anchoredBy),
    });
  }

  if (proof) {
    results.push({
      hash: normalized,
      label: proof.label,
      owner: proof.anchoredBy,
      stacksBlock: proof.stacksBlock,
      source: "proof",
      verifyUrl: buildVerifyUrl(normalized, "proof", proof.anchoredBy),
    });
  }

  // Candidate batch owners: anyone who registered this hash, plus an explicit
  // owner from the caller. The registry is unvalidated (anyone can register an
  // arbitrary hash), so confirm each candidate against the batch map and only
  // surface anchors that actually exist there.
  const candidateOwners = new Set<string>();
  if (owner && STX_PRINCIPAL.test(owner.toUpperCase())) {
    candidateOwners.add(owner.toUpperCase());
  }
  for (const ev of registryEvents) {
    const parsed = parseEvent(ev);
    if (
      parsed &&
      parsed.event === "anchor-registered" &&
      parsed.hash === normalized &&
      STX_PRINCIPAL.test(parsed.owner.toUpperCase())
    ) {
      candidateOwners.add(parsed.owner.toUpperCase());
    }
  }

  const batches = await Promise.all(
    Array.from(candidateOwners).map(async (candidate) => {
      const batch = await readBatchAnchor(normalized, candidate).catch(
        () => null,
      );
      return batch ? { candidate, batch } : null;
    }),
  );
  for (const entry of batches) {
    if (!entry) continue;
    results.push({
      hash: normalized,
      label: entry.batch.label,
      owner: entry.candidate,
      stacksBlock: entry.batch.stacksBlock,
      source: "batch",
      verifyUrl: buildVerifyUrl(normalized, "batch", entry.candidate),
    });
  }

  for (const ev of groupEvents) {
    const parsed = parseEvent(ev);
    if (parsed && parsed.event === "group-anchor-added" && parsed.hash === normalized) {
      results.push(toResult(parsed));
    }
  }

  return dedupe(results).sort((a, b) => b.stacksBlock - a.stacksBlock);
}

// Find everything a principal has anchored. The registry read supplies its most
// recent entries fast; scanning registry print events by owner covers the full
// history (the read returns only the last ten), and the other contracts' events
// surface single anchors, proof mints, and group anchors.
export async function searchByPrincipal(
  principal: string,
): Promise<SearchResult[]> {
  const owner = principal.trim().toUpperCase();
  if (!STX_PRINCIPAL.test(owner)) return [];

  const [registryEntries, singleEvents, registryEvents, proofEvents, groupEvents] =
    await Promise.all([
      getRecentAnchors(owner).catch(() => []),
      fetchAllEvents(SINGLE_CONTRACT).catch(() => [] as RawEvent[]),
      fetchAllEvents(REGISTRY_CONTRACT).catch(() => [] as RawEvent[]),
      fetchAllEvents(PROOF_CONTRACT).catch(() => [] as RawEvent[]),
      fetchAllEvents(GROUPS_CONTRACT).catch(() => [] as RawEvent[]),
    ]);

  const results: SearchResult[] = [];

  for (const entry of registryEntries) {
    if (!entry) continue;
    results.push({
      hash: entry.hash.toLowerCase(),
      label: entry.label,
      owner,
      stacksBlock: entry.anchoredAt,
      source: "registry",
      verifyUrl: buildVerifyUrl(entry.hash.toLowerCase(), "registry", owner),
    });
  }

  for (const ev of [
    ...singleEvents,
    ...registryEvents,
    ...proofEvents,
    ...groupEvents,
  ]) {
    const parsed = parseEvent(ev);
    if (parsed && parsed.owner.toUpperCase() === owner) {
      results.push(toResult(parsed));
    }
  }

  return dedupe(results).sort((a, b) => b.stacksBlock - a.stacksBlock);
}

// Substring match on anchor labels. Batch print events carry no per-hash label,
// so batch hits come from the registry contract's anchor-registered events,
// mirroring how the public feed surfaces batch rows.
export async function searchByLabel(label: string): Promise<SearchResult[]> {
  const needle = label.trim().toLowerCase();
  if (!needle) return [];

  const [singleEvents, registryEvents, groupEvents] = await Promise.all([
    fetchAllEvents(SINGLE_CONTRACT).catch(() => [] as RawEvent[]),
    fetchAllEvents(REGISTRY_CONTRACT).catch(() => [] as RawEvent[]),
    fetchAllEvents(GROUPS_CONTRACT).catch(() => [] as RawEvent[]),
  ]);

  const results: SearchResult[] = [];
  for (const ev of [...singleEvents, ...registryEvents, ...groupEvents]) {
    const parsed = parseEvent(ev);
    if (parsed && parsed.label.toLowerCase().includes(needle)) {
      results.push(toResult(parsed));
    }
  }

  return dedupe(results).sort((a, b) => b.stacksBlock - a.stacksBlock);
}

// Dispatch a query to the right search by explicit type, or auto-detect.
export async function runSearch(
  query: string,
  type: SearchType = "auto",
  owner?: string,
): Promise<SearchResult[]> {
  const resolved = type === "auto" ? detectSearchType(query) : type;
  switch (resolved) {
    case "hash":
      return searchByHash(query, owner);
    case "principal":
      return searchByPrincipal(query);
    case "label":
      return searchByLabel(query);
  }
}
