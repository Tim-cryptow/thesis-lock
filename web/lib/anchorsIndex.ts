// Query helpers over the thesis_locks index, which mirrors the thesislock
// contract's anchor-created events (single anchors). They read through the
// browser-safe anon client and return the same shapes the existing Hiro read
// paths produce, so call sites swap mechanically. Every read excludes reverted
// rows (reorg correctness) and degrades to null when the index is unreachable so
// callers can fall back to Hiro.

import { getSupabaseRead } from "./supabaseClient";
import { fetchAnchor, type FetchedAnchor } from "./hiroAnchor";

const HEX_64 = /^[0-9a-f]{64}$/;

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
    hash: (row.hash ?? "").toLowerCase(),
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

// Resolve a single anchor by hash for the verify/detail path. The index is a
// best-effort-fast cache, so on an index miss (or when the index is unreachable)
// this falls back to the live Hiro contract read for that one hash. A recent,
// not-yet-indexed anchor therefore never reads as "not found": the chain stays
// the source of truth. Returns the same FetchedAnchor shape fetchAnchor returns,
// so the verify lookup swaps mechanically.
export async function getAnchorByHash(
  hash: string,
): Promise<FetchedAnchor | null> {
  const normalized = (
    hash.startsWith("0x") ? hash.slice(2) : hash
  ).toLowerCase();
  if (!HEX_64.test(normalized)) return null;

  const supabase = getSupabaseRead();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(ANCHORS_TABLE)
        .select(ANCHOR_COLUMNS)
        .eq("reverted", false)
        // Match whether the column stored the hash with or without a 0x prefix.
        .or(`hash.eq.0x${normalized},hash.eq.${normalized}`)
        .limit(1);
      if (!error && data && data.length > 0) {
        const anchor = rowToAnchor(data[0] as unknown as AnchorRow);
        return {
          anchoredBy: anchor.anchoredBy,
          stacksBlock: anchor.stacksBlock,
          burnBlock: anchor.burnBlock,
          label: anchor.label,
        };
      }
      // No row in the index: fall through to the chain rather than returning a
      // false negative for a recent, not-yet-indexed anchor.
    } catch {
      // Index unreachable: fall through to the chain.
    }
  }

  return fetchAnchor(normalized);
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
  try {
    let q = supabase
      .from(ANCHORS_TABLE)
      .select(ANCHOR_COLUMNS)
      .eq("reverted", false);
    if (type === "hash") {
      const normalized = (
        query.startsWith("0x") ? query.slice(2) : query
      ).toLowerCase();
      if (!HEX_64.test(normalized)) return [];
      q = q.or(`hash.eq.0x${normalized},hash.eq.${normalized}`);
    } else if (type === "principal") {
      q = q.eq("anchored_by", query.trim().toUpperCase());
    } else {
      // Substring match. Strip LIKE wildcards so they match literally, the same
      // way the Hiro path's String.includes does.
      const needle = query.trim().replace(/[%_]/g, "");
      if (!needle) return [];
      q = q.ilike("label", `%${needle}%`);
    }
    const { data, error } = await q
      .order("block_height", { ascending: false })
      .order("tx_id", { ascending: false })
      .limit(1000);
    if (error || !data) return null;
    return (data as unknown as AnchorRow[]).map(rowToAnchor);
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
