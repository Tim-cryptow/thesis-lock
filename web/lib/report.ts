import { searchByHash, type SearchResult, type SearchSource } from "./search";
import { getProofByHash } from "./stacks";
import { parseLabel, type ParsedTemplate } from "./templates";

// A formal verification report covers many documents at once. Each entry records
// the on-chain status of one hash across every contract (single anchor, batch,
// registry, group, and proof NFT), and the summary rolls those up into the
// headline statistics an auditor needs.

export type ReportEntry = {
  hash: string;
  filename?: string;
  verified: boolean;
  source: string | null;
  label: string | null;
  owner: string | null;
  block: number | null;
  proofNFT: number | null;
  template?: ParsedTemplate;
  // Exact verify-page path for this anchor, carrying the owner or group/index
  // that pins it to the precise on-chain row this entry describes.
  verifyUrl?: string;
};

export type ReportData = {
  title: string;
  // ISO timestamp of when the report was generated.
  generatedAt: string;
  // Connected wallet that generated the report, or null when anonymous.
  generatedBy: string | null;
  hashes: ReportEntry[];
  summary: {
    total: number;
    verified: number;
    notFound: number;
    // Count of verified entries by source ("single", "batch", "group", ...).
    sources: Record<string, number>;
  };
};

// A per-item `owner` pins an owner-keyed batch record for this specific hash,
// taking precedence over the report-level owner. `groupId`/`groupIndex` pin a
// specific group row. Carried from sources (like a collection) that know which
// record a hash was collected from, so the report resolves that exact record
// rather than a global single anchor, a different owner's batch, or a different
// group row for the same hash.
export type HashInput = {
  hash: string;
  filename?: string;
  owner?: string;
  groupId?: number;
  groupIndex?: number;
};

export const DEFAULT_REPORT_TITLE = "Verification Report";

// Upper bound on hashes per report. Each one pages a contract's full event
// history, so an unbounded list would hammer the Hiro API. Shared by the API
// route and the builder UI so both enforce the same limit.
export const MAX_REPORT_HASHES = 200;

const HEX_64 = /^[0-9a-f]{64}$/;

function normalizeHash(raw: string): string {
  const stripped = raw.trim().toLowerCase();
  return stripped.startsWith("0x") ? stripped.slice(2) : stripped;
}

// Authority order when a hash resolves in more than one contract. The registry
// is unvalidated (anyone can register an arbitrary hash), so it ranks below the
// contracts that actually hold the anchor; proofs are strong but carry the least
// metadata, so they rank last for the headline source.
const SOURCE_PRIORITY: Record<SearchSource, number> = {
  single: 5,
  batch: 4,
  group: 3,
  proof: 2,
  registry: 1,
};

function pickBest(
  results: SearchResult[],
  pin?: { owner?: string; groupId?: number; groupIndex?: number },
): SearchResult | null {
  if (results.length === 0) return null;
  const wanted = pin?.owner?.toUpperCase();
  const pinnedGroup = pin?.groupId !== undefined && pin?.groupIndex !== undefined;
  return [...results].sort((a, b) => {
    // A pinned group row (the exact { group-id, index } a hash was collected
    // from) is the record being asked about, so it outranks everything,
    // including a global single anchor for the same hash.
    if (pinnedGroup) {
      const aGroup =
        a.source === "group" && a.groupId === pin!.groupId && a.groupIndex === pin!.groupIndex;
      const bGroup =
        b.source === "group" && b.groupId === pin!.groupId && b.groupIndex === pin!.groupIndex;
      if (aGroup !== bGroup) return aGroup ? -1 : 1;
    }
    // When the caller named an owner, that wallet's batch anchor is the record
    // they are asking about, so it outranks a global single anchor that may
    // describe a different owner, label, and block for the same hash. This
    // mirrors the verify and certificate paths, which check the owner-keyed
    // batch first.
    if (wanted) {
      const aOwnerBatch = a.source === "batch" && a.owner.toUpperCase() === wanted;
      const bOwnerBatch = b.source === "batch" && b.owner.toUpperCase() === wanted;
      if (aOwnerBatch !== bOwnerBatch) return aOwnerBatch ? -1 : 1;
    }
    const byPriority = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source];
    if (byPriority !== 0) return byPriority;
    return b.stacksBlock - a.stacksBlock;
  })[0]!;
}

// Resolves a single hash into a report entry by checking every contract. A
// not-found or malformed hash still produces an entry (verified: false) so the
// report reflects exactly what was requested.
export async function verifyReportEntry(input: HashInput, owner?: string): Promise<ReportEntry> {
  const hash = normalizeHash(input.hash);
  // A per-item owner takes precedence over the report-level owner so a hash
  // collected as a specific wallet's batch record resolves to that record.
  const effectiveOwner = input.owner ?? owner;
  const base: ReportEntry = {
    hash,
    ...(input.filename ? { filename: input.filename } : {}),
    verified: false,
    source: null,
    label: null,
    owner: null,
    block: null,
    proofNFT: null,
  };

  if (!HEX_64.test(hash)) return base;

  const [results, proof] = await Promise.all([
    searchByHash(hash, effectiveOwner).catch(() => [] as SearchResult[]),
    getProofByHash(hash).catch(() => null),
  ]);

  const best = pickBest(results, {
    owner: effectiveOwner,
    groupId: input.groupId,
    groupIndex: input.groupIndex,
  });
  if (!best && !proof) return base;

  const label = best?.label || proof?.label || "";
  return {
    ...base,
    verified: true,
    source: best?.source ?? "proof",
    label: label || null,
    owner: best?.owner ?? proof?.anchoredBy ?? null,
    block: best?.stacksBlock ?? proof?.stacksBlock ?? null,
    proofNFT: proof?.tokenId ?? null,
    ...(label ? { template: parseLabel(label) } : {}),
    ...(best?.verifyUrl ? { verifyUrl: best.verifyUrl } : {}),
  };
}

function summarize(entries: ReportEntry[]): ReportData["summary"] {
  const sources: Record<string, number> = {};
  let verified = 0;
  for (const entry of entries) {
    if (entry.verified) {
      verified += 1;
      const key = entry.source ?? "unknown";
      sources[key] = (sources[key] ?? 0) + 1;
    }
  }
  return {
    total: entries.length,
    verified,
    notFound: entries.length - verified,
    sources,
  };
}

// Cap on hashes verified at once. Each verification pages a contract's full
// event history, so an unbounded fan-out over a large list would hammer the Hiro
// API; this keeps the report responsive without dropping entries.
const REPORT_CONCURRENCY = 4;

// Builds a full report from a list of hashes. Entries keep their input order so
// the rendered report matches what the user assembled. The optional onProgress
// callback fires as each entry settles, driving the per-hash progress UI.
export async function generateReport(
  hashes: HashInput[],
  owner?: string,
  onProgress?: (done: number, total: number, entry: ReportEntry, index: number) => void,
): Promise<ReportData> {
  const entries: ReportEntry[] = new Array(hashes.length);
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < hashes.length) {
      const index = next;
      next += 1;
      const entry = await verifyReportEntry(hashes[index]!, owner);
      entries[index] = entry;
      done += 1;
      onProgress?.(done, hashes.length, entry, index);
    }
  };

  const workers = Array.from({ length: Math.min(REPORT_CONCURRENCY, hashes.length) }, worker);
  await Promise.all(workers);

  return {
    title: DEFAULT_REPORT_TITLE,
    generatedAt: new Date().toISOString(),
    generatedBy: owner ?? null,
    hashes: entries,
    summary: summarize(entries),
  };
}
