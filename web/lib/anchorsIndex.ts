// Query helpers over the thesis_locks index, which mirrors the thesislock
// contract's anchor-created events (single anchors). They read through the
// browser-safe anon client and return the same shapes the existing Hiro read
// paths produce, so call sites swap mechanically. Every read excludes reverted
// rows (reorg correctness) and degrades to null when the index is unreachable so
// callers can fall back to Hiro. The trust-critical verify path (getAnchorByHash)
// inverts this: it reads the contract first and uses the index only as an outage
// fallback, since positive verification must stay chain-authoritative.

import { getSupabaseRead } from "./supabaseClient";
import { fetchAnchorStrict, type FetchedAnchor } from "./hiroAnchor";

const HEX_64 = /^[0-9a-f]{64}$/;
// Page size for indexed searches, and a safety cap to bound a runaway loop.
const SEARCH_PAGE = 1000;
const SEARCH_SAFETY_CAP = 50000;

export const ANCHORS_TABLE = "thesis_locks";

// The columns every read selects, kept beside the row type so they stay in sync.
export const ANCHOR_COLUMNS =
  "tx_id, block_height, sender, hash, anchored_by, stacks_block, burn_block, label, reverted";

// A single thesis_locks row, as written by the chainhook ingestion route.
export type AnchorRow = {
  tx_id: string;
  block_height: number | null;
  sender: string | null;
  hash: string | null;
  anchored_by: string | null;
  stacks_block: number | null;
  burn_block: number | null;
  label: string | null;
  reverted: boolean;
};

// Normalized anchor shared by every helper. Field names mirror the camelCase the
// UI already uses, so mapping into FeedEntry, ProfileAnchor, SearchResult, or
// FetchedAnchor is a trivial pick of fields.
export type IndexAnchor = {
  hash: string;
  anchoredBy: string;
  label: string;
  stacksBlock: number;
  burnBlock: number;
  txId: string;
  blockHeight: number;
};

// The single column->UI-type mapper every helper reuses.
export function rowToAnchor(row: AnchorRow): IndexAnchor {
  return {
    // The index stores the hash 0x-prefixed; the UI (feed links, search dedup,
    // /v/<hash> which requires 64 bare hex chars) uses a 0x-free lowercase hash.
    hash: (row.hash ?? "").replace(/^0x/i, "").toLowerCase(),
    anchoredBy: row.anchored_by ?? "",
    label: row.label ?? "",
    stacksBlock: Number(row.stacks_block ?? 0),
    burnBlock: Number(row.burn_block ?? 0),
    txId: row.tx_id,
    blockHeight: Number(row.block_height ?? 0),
  };
}

// Opaque keyset cursor for stable feed pagination across pages.
export type AnchorCursor = { blockHeight: number; txId: string };

// Recent single anchors for the feed, newest first. Backed by
// thesis_locks_recent_idx (block_height desc where reverted = false). The cursor
// pages by (block_height, tx_id) so pagination stays stable when several anchors
// share a block. Returns null when the index is unavailable so the feed can fall
// back to the Hiro event stream.
export async function getRecentAnchors(
  limit: number,
  cursor?: AnchorCursor,
): Promise<IndexAnchor[] | null> {
  const supabase = getSupabaseRead();
  if (!supabase) return null;
  try {
    let query = supabase
      .from(ANCHORS_TABLE)
      .select(ANCHOR_COLUMNS)
      .eq("reverted", false)
      .order("block_height", { ascending: false })
      .order("tx_id", { ascending: false })
      .limit(limit);
    if (cursor) {
      // Rows strictly older than the cursor in (block_height desc, tx_id desc).
      query = query.or(
        `block_height.lt.${cursor.blockHeight},and(block_height.eq.${cursor.blockHeight},tx_id.lt.${cursor.txId})`,
      );
    }
    const { data, error } = await query;
    if (error || !data) return null;
    return (data as unknown as AnchorRow[]).map(rowToAnchor);
  } catch {
    return null;
  }
}

// Single anchors a principal created, newest first. Backed by
// thesis_locks_anchored_by_idx. Returns null when the index is unavailable so
// the profile can fall back to the Hiro registry read.
export async function getAnchorsByPrincipal(
  principal: string,
  limit = 50,
): Promise<IndexAnchor[] | null> {
  const supabase = getSupabaseRead();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(ANCHORS_TABLE)
      .select(ANCHOR_COLUMNS)
      .eq("reverted", false)
      .eq("anchored_by", principal)
      .order("block_height", { ascending: false })
      .order("tx_id", { ascending: false })
      .limit(limit);
    if (error || !data) return null;
    return (data as unknown as AnchorRow[]).map(rowToAnchor);
  } catch {
    return null;
  }
}

// Resolve a single anchor by hash for the trust-critical verify/detail path. The
// live contract is the source of truth for positive verification, so this reads
// the chain first: a stale index row (a reorg whose reverted update has not been
// delivered yet) must never certify a rolled-back anchor. The index is consulted
// only as a best-effort fallback when the chain read itself is unreachable, so a
// Hiro outage does not turn a real anchor into a false negative. Returns the same
// FetchedAnchor shape fetchAnchor returns, so the verify lookup swaps mechanically.
export async function getAnchorByHash(hash: string): Promise<FetchedAnchor | null> {
  const normalized = (hash.startsWith("0x") ? hash.slice(2) : hash).toLowerCase();
  if (!HEX_64.test(normalized)) return null;

  try {
    // Chain says found -> verified; chain authoritatively says none -> not found.
    // We deliberately do not resurrect a stale index row on a clean not-found.
    return await fetchAnchorStrict(normalized);
  } catch {
    // Chain read unreachable: best-effort fallback to the index.
    return indexAnchorByHash(normalized);
  }
}

// Best-effort index lookup backing the verify fallback above: returns the
// matching non-reverted anchor, or null on a miss or when the index is
// unreachable. Only reached when the live contract read is down, so verification
// keeps working (in a clearly degraded mode) during a Hiro outage.
async function indexAnchorByHash(normalized: string): Promise<FetchedAnchor | null> {
  const supabase = getSupabaseRead();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from(ANCHORS_TABLE)
      .select(ANCHOR_COLUMNS)
      .eq("reverted", false)
      // Match whether the column stored the hash with or without a 0x prefix.
      .or(`hash.eq.0x${normalized},hash.eq.${normalized}`)
      .limit(1);
    if (error || !data || data.length === 0) return null;
    const anchor = rowToAnchor(data[0] as unknown as AnchorRow);
    return {
      anchoredBy: anchor.anchoredBy,
      stacksBlock: anchor.stacksBlock,
      burnBlock: anchor.burnBlock,
      label: anchor.label,
    };
  } catch {
    return null;
  }
}

// Search single anchors in the index by exact hash, exact principal, or label
// substring (case-insensitive), newest first. Returns null when the index is
// unavailable so search can fall back to the Hiro single-contract event scan.
export async function searchAnchors(
  query: string,
  type: "hash" | "principal" | "label",
): Promise<IndexAnchor[] | null> {
  const supabase = getSupabaseRead();
  if (!supabase) return null;

  // Resolve the filter inputs once, bailing on invalid input.
  let hashNorm = "";
  let owner = "";
  let needle = "";
  let labelPattern = "";
  if (type === "hash") {
    hashNorm = (query.startsWith("0x") ? query.slice(2) : query).toLowerCase();
    if (!HEX_64.test(hashNorm)) return [];
  } else if (type === "principal") {
    owner = query.trim().toUpperCase();
  } else {
    needle = query.trim();
    if (!needle) return [];
    // Escape the LIKE metacharacters (\ % _) so they match literally instead of
    // acting as wildcards, preserving labels like "draft_v2" or "50%". A bare
    // value deleted them, which both lost characters and broadened the match.
    labelPattern = needle.replace(/[\\%_]/g, "\\$&");
  }

  try {
    // Page to exhaustion: PostgREST caps a single response, so a wallet or label
    // with many matches must be paged rather than silently dropping older rows
    // (the Hiro path it replaces scanned events to exhaustion).
    const rows: AnchorRow[] = [];
    for (let offset = 0; offset < SEARCH_SAFETY_CAP; offset += SEARCH_PAGE) {
      let q = supabase.from(ANCHORS_TABLE).select(ANCHOR_COLUMNS).eq("reverted", false);
      if (type === "hash") {
        q = q.or(`hash.eq.0x${hashNorm},hash.eq.${hashNorm}`);
      } else if (type === "principal") {
        q = q.eq("anchored_by", owner);
      } else {
        q = q.ilike("label", `%${labelPattern}%`);
      }
      const { data, error } = await q
        .order("block_height", { ascending: false })
        .order("tx_id", { ascending: false })
        .range(offset, offset + SEARCH_PAGE - 1);
      if (error || !data) return null;
      rows.push(...(data as unknown as AnchorRow[]));
      if (data.length < SEARCH_PAGE) break;
    }
    const anchors = rows.map(rowToAnchor);
    // PostgREST also treats * as a wildcard (it cannot be escaped in the
    // pattern), so re-check label hits with an exact, case-insensitive substring
    // match to mirror the Hiro path's String.includes and drop any over-matches.
    if (type === "label") {
      const lower = needle.toLowerCase();
      return anchors.filter((a) => a.label.toLowerCase().includes(lower));
    }
    return anchors;
  } catch {
    return null;
  }
}

export type IndexStats = {
  totalAnchors: number;
  uniqueWallets: number;
  firstBlock: number;
  latestBlock: number;
};

// Aggregate stats over the single-anchor index: total non-reverted anchors,
// distinct anchoring wallets, and the first/latest anchored block. Returns null
// when the index is unavailable so stats can fall back to the Hiro computation.
export async function getStats(): Promise<IndexStats | null> {
  const supabase = getSupabaseRead();
  if (!supabase) return null;
  try {
    // Exact count without transferring rows.
    const countRes = await supabase
      .from(ANCHORS_TABLE)
      .select("tx_id", { count: "exact", head: true })
      .eq("reverted", false);
    if (countRes.error || countRes.count === null) return null;
    const totalAnchors = countRes.count;

    const [latestRes, firstRes] = await Promise.all([
      supabase
        .from(ANCHORS_TABLE)
        .select("block_height")
        .eq("reverted", false)
        .order("block_height", { ascending: false })
        .limit(1),
      supabase
        .from(ANCHORS_TABLE)
        .select("block_height")
        .eq("reverted", false)
        .order("block_height", { ascending: true })
        .limit(1),
    ]);
    if (latestRes.error || firstRes.error) return null;
    const readBlock = (row: unknown): number =>
      Number((row as { block_height?: number } | undefined)?.block_height ?? 0);
    const latestBlock = readBlock(latestRes.data?.[0]);
    const firstBlock = readBlock(firstRes.data?.[0]);

    // Distinct anchoring wallets. PostgREST has no COUNT(DISTINCT), so read the
    // anchored_by column and dedupe; one small column stays cheap to transfer.
    const walletsRes = await supabase
      .from(ANCHORS_TABLE)
      .select("anchored_by")
      .eq("reverted", false)
      .limit(10000);
    if (walletsRes.error || !walletsRes.data) return null;
    const wallets = new Set<string>();
    for (const row of walletsRes.data as Array<{ anchored_by: string | null }>) {
      if (row.anchored_by) wallets.add(row.anchored_by);
    }

    return { totalAnchors, uniqueWallets: wallets.size, firstBlock, latestBlock };
  } catch {
    return null;
  }
}
