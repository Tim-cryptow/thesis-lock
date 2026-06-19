import { cvToValue, deserializeCV } from "@stacks/transactions";
import {
  getLastTokenId,
  getProof,
  getProofByHash,
  getRecentAnchors,
  readAnchor,
  readBatchAnchor,
} from "./stacks";
import { fetchWithRetry } from "./fetchWithRetry";

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
  groupIndex?: number;
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

// Owner-keyed sources (batch, registry) are only publicly resolvable on the
// verify page when the owner principal travels with the link; single and proof
// anchors are keyed by hash alone. Group anchors are keyed on chain by
// { group-id, index }, so a hash anchored in several groups (or re-anchored in
// one) needs both to point at the exact row the search result represents;
// without them the verify page resolves the newest group anchor for the hash
// and can show a different anchor than the one clicked.
function buildVerifyUrl(
  hash: string,
  source: SearchSource,
  owner: string,
  groupId?: number,
  groupIndex?: number,
): string {
  const base = `/v/${hash}`;
  if (source === "group" && groupId !== undefined && groupIndex !== undefined) {
    return `${base}?group=${groupId}&gi=${groupIndex}`;
  }
  const ownerKeyed = source === "batch" || source === "registry";
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
  const res = await fetchWithRetry(url);
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
  groupIndex?: number;
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
      groupIndex: asNumber(tuple["index"]),
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
    ...(parsed.groupIndex !== undefined ? { groupIndex: parsed.groupIndex } : {}),
    verifyUrl: buildVerifyUrl(
      parsed.hash,
      source,
      parsed.owner,
      parsed.groupId,
      parsed.groupIndex,
    ),
  };
}

function dedupeKey(r: SearchResult): string {
  return `${r.source}|${r.hash}|${r.owner}|${r.groupId ?? ""}|${r.groupIndex ?? ""}`;
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

  const batches = await mapWithConcurrency(
    Array.from(candidateOwners),
    async (candidate) => {
      const batch = await readBatchAnchor(normalized, candidate).catch(
        () => null,
      );
      return batch ? { candidate, batch } : null;
    },
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

// Resolve batch and group anchors for many bare hashes with a single pass over
// the registry and group event streams, instead of one full scan per hash.
// Single and proof anchors are hash-keyed and cheap to read individually, so
// they are intentionally left to the caller; this covers only the owner-keyed
// (batch) and location-keyed (group) contracts that otherwise force an event
// scan. Returns the newest matching anchor per hash.
export async function discoverBatchAndGroupAnchors(
  hashes: string[],
  explicitOwners?: Record<string, string>,
): Promise<Map<string, SearchResult>> {
  const targets = new Set(
    hashes.map((h) => stripHex(h).toLowerCase()).filter((h) => HEX_64.test(h)),
  );
  const out = new Map<string, SearchResult>();
  if (targets.size === 0) return out;

  const [groupEvents, registryEvents] = await Promise.all([
    fetchAllEvents(GROUPS_CONTRACT).catch(() => [] as RawEvent[]),
    fetchAllEvents(REGISTRY_CONTRACT).catch(() => [] as RawEvent[]),
  ]);

  const consider = (result: SearchResult) => {
    if (!targets.has(result.hash)) return;
    const existing = out.get(result.hash);
    if (!existing || result.stacksBlock > existing.stacksBlock) {
      out.set(result.hash, result);
    }
  };

  // Group anchors are keyed by { group-id, index }, discoverable only via events.
  for (const ev of groupEvents) {
    const parsed = parseEvent(ev);
    if (
      parsed &&
      parsed.event === "group-anchor-added" &&
      targets.has(parsed.hash)
    ) {
      consider(toResult(parsed));
    }
  }

  // Batch anchors are keyed by { hash, owner }. Candidate owners come from the
  // registry events for the target hashes (every batch entry is also
  // registered) plus any explicit owner the caller supplies; confirm each
  // against the batch map.
  const candidates: Array<{ hash: string; owner: string }> = [];
  const seen = new Set<string>();
  const addCandidate = (hash: string, owner: string) => {
    const o = owner.toUpperCase();
    if (!STX_PRINCIPAL.test(o)) return;
    const key = `${hash}|${o}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({ hash, owner: o });
  };
  if (explicitOwners) {
    for (const [hash, owner] of Object.entries(explicitOwners)) {
      const h = stripHex(hash).toLowerCase();
      if (targets.has(h)) addCandidate(h, owner);
    }
  }
  for (const ev of registryEvents) {
    const parsed = parseEvent(ev);
    if (
      parsed &&
      parsed.event === "anchor-registered" &&
      targets.has(parsed.hash)
    ) {
      addCandidate(parsed.hash, parsed.owner);
    }
  }

  const batches = await mapWithConcurrency(
    candidates,
    async ({ hash, owner }) => {
      const batch = await readBatchAnchor(hash, owner).catch(() => null);
      return batch ? { hash, owner, batch } : null;
    },
  );
  for (const entry of batches) {
    if (!entry) continue;
    consider({
      hash: entry.hash,
      label: entry.batch.label,
      owner: entry.owner,
      stacksBlock: entry.batch.stacksBlock,
      source: "batch",
      verifyUrl: buildVerifyUrl(entry.hash, "batch", entry.owner),
    });
  }

  return out;
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

// Cap on concurrent Hiro read-only calls. An unbounded Promise.all over every
// registry row or proof id can fan out thousands of simultaneous requests;
// rate-limited or timed-out calls are swallowed by per-call catches and
// silently drop real matches.
const READ_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(READ_CONCURRENCY, items.length) },
    async () => {
      while (next < items.length) {
        const i = next;
        next += 1;
        results[i] = await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

// Read every minted proof. Token ids run 1..last-token-id, and the proof-minted
// event omits the label, so labels are only recoverable by reading proof-data
// per token. Without this, proof-only anchors are invisible to label search.
async function fetchAllProofs(): Promise<SearchResult[]> {
  const lastId = await getLastTokenId();
  if (!Number.isFinite(lastId) || lastId < 1) return [];

  const ids = Array.from({ length: lastId }, (_, i) => i + 1);
  const proofs = await mapWithConcurrency(ids, (id) =>
    getProof(id).catch(() => null),
  );

  const results: SearchResult[] = [];
  for (const proof of proofs) {
    if (!proof) continue;
    const hash = stripHex(proof.hash).toLowerCase();
    results.push({
      hash,
      label: proof.label,
      owner: proof.anchoredBy,
      stacksBlock: proof.stacksBlock,
      source: "proof",
      verifyUrl: buildVerifyUrl(hash, "proof", proof.anchoredBy),
    });
  }
  return results;
}

// Substring match on anchor labels. Batch print events carry no per-hash label,
// so batch hits come from the registry contract's anchor-registered events. The
// registry is unvalidated (anyone can register an arbitrary hash), so each
// registry hit is confirmed against the batch map before it is surfaced. Proof
// labels live only in proof-data (not the event), so proofs are enumerated by
// token id.
export async function searchByLabel(label: string): Promise<SearchResult[]> {
  const needle = label.trim().toLowerCase();
  if (!needle) return [];

  const [singleEvents, registryEvents, groupEvents, proofResults] =
    await Promise.all([
      fetchAllEvents(SINGLE_CONTRACT).catch(() => [] as RawEvent[]),
      fetchAllEvents(REGISTRY_CONTRACT).catch(() => [] as RawEvent[]),
      fetchAllEvents(GROUPS_CONTRACT).catch(() => [] as RawEvent[]),
      fetchAllProofs().catch(() => [] as SearchResult[]),
    ]);

  const results: SearchResult[] = [];
  for (const ev of [...singleEvents, ...groupEvents]) {
    const parsed = parseEvent(ev);
    if (parsed && parsed.label.toLowerCase().includes(needle)) {
      results.push(toResult(parsed));
    }
  }

  // Registry labels are untrusted and not constrained to match the batch
  // map's stored label, so they cannot prefilter candidates in either
  // direction: every unique { hash, owner } pair from anchor-registered events
  // is confirmed against the batch map, and the match runs on the batch map's
  // authoritative label, which is also what gets displayed.
  const registryHits = new Map<string, ParsedEvent>();
  for (const ev of registryEvents) {
    const parsed = parseEvent(ev);
    if (
      parsed &&
      parsed.event === "anchor-registered" &&
      STX_PRINCIPAL.test(parsed.owner.toUpperCase())
    ) {
      registryHits.set(`${parsed.hash}|${parsed.owner}`, parsed);
    }
  }
  const confirmed = await mapWithConcurrency(
    Array.from(registryHits.values()),
    async (hit) => {
      const batch = await readBatchAnchor(hit.hash, hit.owner).catch(
        () => null,
      );
      return batch ? { hit, batch } : null;
    },
  );
  for (const entry of confirmed) {
    if (!entry) continue;
    if (!entry.batch.label.toLowerCase().includes(needle)) continue;
    results.push({
      hash: entry.hit.hash,
      label: entry.batch.label,
      owner: entry.hit.owner,
      stacksBlock: entry.batch.stacksBlock,
      source: "batch",
      verifyUrl: buildVerifyUrl(entry.hit.hash, "batch", entry.hit.owner),
    });
  }

  for (const proof of proofResults) {
    if (proof.label.toLowerCase().includes(needle)) {
      results.push(proof);
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
