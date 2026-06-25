// Query helpers over the thesis_locks index, which mirrors the thesislock
// contract's anchor-created events (single anchors). They read through the
// browser-safe anon client and return the same shapes the existing Hiro read
// paths produce, so call sites swap mechanically. Every read excludes reverted
// rows (reorg correctness) and degrades to null when the index is unreachable so
// callers can fall back to Hiro.

import { getSupabaseRead } from "./supabaseClient";

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
