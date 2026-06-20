// Client-side watchlist. Users save document hashes, wallets, and groups they
// care about; the watchlist stores them in the browser and checks each one's
// on-chain status on demand. There is no server component: storage is
// localStorage and status checks read the public Hiro API directly, mirroring
// the rest of the app.

import {
  getAnchorCount,
  getGroup,
  getGroupAnchorAt,
  getGroupAnchorCount,
  getProofByHash,
  readAnchor,
  readBatchAnchor,
} from "./stacks";
import { type SearchResult, discoverBatchAndGroupAnchors } from "./search";
import { addNotification } from "./notifications";

const STORAGE_KEY = "thesislock_watchlist";

// Dispatched on the window whenever the stored watchlist changes, so the nav
// badge and summary widget can refresh without prop drilling or a shared store.
export const WATCHLIST_CHANGED_EVENT = "thesislock:watchlist-changed";

export type WatchType = "hash" | "wallet" | "group";

export type WatchStatus = {
  verified: boolean;
  source?: string;
  block?: number;
  anchorCount?: number;
  // New anchors (or a fresh verification) observed since the previous check.
  newAnchors?: number;
  // Source keys discovered for a hash during the check (the batch owner, or a
  // group id and index). Used to backfill a context-less item so its View link
  // and later checks target the exact record.
  owner?: string;
  groupId?: number;
  groupIndex?: number;
};

// Source context for a hash watch. A batch anchor is keyed by { hash, owner }
// and a group anchor by { group-id, index }, so the bare hash is not enough to
// resolve them. When a hash is watched from a search or feed row that already
// knows its source, we carry the extra keys so checkWatch can verify it and the
// View link can point at the right record.
export type WatchContext = {
  owner?: string;
  groupId?: number;
  groupIndex?: number;
};

export type WatchItem = {
  id: string;
  type: WatchType;
  value: string;
  label: string;
  context?: WatchContext;
  // ISO timestamps.
  addedAt: string;
  lastChecked: string | null;
  lastStatus: WatchStatus | null;
  notifications: boolean;
};

function nowIso(): string {
  return new Date().toISOString();
}

// Short opaque id, independent of the watched value.
function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    let out = "";
    for (const b of bytes) out += b.toString(16).padStart(2, "0");
    return out;
  }
  // Fallback for environments without web crypto; ids only need to be unique
  // within one browser's list.
  return `${nowIso()}-${String(Math.floor(performance.now()))}`;
}

// Values are normalized so the same hash or wallet is never watched twice under
// different casing. Group ids are kept verbatim (digits).
export function normalizeWatchValue(type: WatchType, value: string): string {
  const trimmed = value.trim();
  if (type === "hash") return trimmed.toLowerCase().replace(/^0x/, "");
  if (type === "wallet") return trimmed.toUpperCase();
  return trimmed;
}

function defaultLabel(type: WatchType, value: string): string {
  if (type === "hash") {
    return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
  }
  if (type === "wallet") {
    return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
  }
  return `Group #${value}`;
}

// localStorage is read defensively: it is unavailable during SSR and can throw
// in private-mode browsers, so every access is guarded.
export function loadWatchlist(): WatchItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is WatchItem =>
        !!i &&
        typeof (i as WatchItem).id === "string" &&
        typeof (i as WatchItem).value === "string",
    );
  } catch {
    return [];
  }
}

export function saveWatchlist(items: WatchItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Persistence is best-effort; callers keep the in-memory list.
  }
  try {
    window.dispatchEvent(new CustomEvent(WATCHLIST_CHANGED_EVENT));
  } catch {
    // CustomEvent may be unavailable in some environments; non-fatal.
  }
}

// True when a value of the given type is already on the watchlist.
export function isWatched(type: WatchType, value: string): boolean {
  const normalized = normalizeWatchValue(type, value);
  return loadWatchlist().some(
    (i) => i.type === type && i.value === normalized,
  );
}

// Creates and persists a watch item, returning it. If the value is already
// watched, the existing item is returned and nothing is added.
export function addWatch(
  type: WatchType,
  value: string,
  label?: string,
  context?: WatchContext,
): WatchItem {
  const normalized = normalizeWatchValue(type, value);
  const items = loadWatchlist();
  const existing = items.find((i) => i.type === type && i.value === normalized);
  if (existing) return existing;

  const cleanContext = normalizeContext(context);
  const item: WatchItem = {
    id: makeId(),
    type,
    value: normalized,
    label: label?.trim() || defaultLabel(type, normalized),
    ...(cleanContext ? { context: cleanContext } : {}),
    addedAt: nowIso(),
    lastChecked: null,
    lastStatus: null,
    notifications: true,
  };
  saveWatchlist([item, ...items]);
  return item;
}

// Drops empty fields and uppercases the owner principal. Returns undefined when
// nothing useful remains, so items without context stay clean.
function normalizeContext(context?: WatchContext): WatchContext | undefined {
  if (!context) return undefined;
  const out: WatchContext = {};
  if (context.owner) out.owner = context.owner.toUpperCase();
  if (typeof context.groupId === "number") out.groupId = context.groupId;
  if (typeof context.groupIndex === "number") out.groupIndex = context.groupIndex;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function removeWatch(id: string): void {
  saveWatchlist(loadWatchlist().filter((i) => i.id !== id));
}

// Removes a watch by its (type, value) pair. Convenience for toggle buttons that
// know what they are watching but not the generated id.
export function removeWatchByValue(type: WatchType, value: string): void {
  const normalized = normalizeWatchValue(type, value);
  saveWatchlist(
    loadWatchlist().filter(
      (i) => !(i.type === type && i.value === normalized),
    ),
  );
}

// Toggles per-item notifications and persists.
export function setWatchNotifications(id: string, on: boolean): void {
  saveWatchlist(
    loadWatchlist().map((i) =>
      i.id === id ? { ...i, notifications: on } : i,
    ),
  );
}

function newFlag(item: WatchItem, verified: boolean): number {
  return item.lastStatus !== null && verified && !item.lastStatus?.verified
    ? 1
    : 0;
}

// Builds a verified status from a discovered batch/group anchor, carrying the
// source keys so the item's context can be backfilled.
function statusFromResult(item: WatchItem, result: SearchResult): WatchStatus {
  const status: WatchStatus = {
    verified: true,
    source: result.source,
    block: result.stacksBlock,
    newAnchors: newFlag(item, true),
  };
  if (result.source === "batch") status.owner = result.owner;
  if (result.source === "group") {
    status.groupId = result.groupId;
    status.groupIndex = result.groupIndex;
  }
  return status;
}

// Per-item resolution that avoids the expensive cross-contract event scan. For
// a hash it tries the stored context and the hash-keyed single/proof contracts;
// an unverified hash result means a batch/group event scan is still needed,
// which callers can batch across items. Wallet and group checks are complete.
async function checkWatchCheap(item: WatchItem): Promise<WatchStatus> {
  if (item.type === "hash") {
    const ctx = item.context;
    // Prefer the source the hash was bookmarked from: batch and group anchors
    // need their extra keys and would otherwise read as not found.
    if (ctx?.owner) {
      const batch = await readBatchAnchor(item.value, ctx.owner);
      if (batch) {
        return {
          verified: true,
          source: "batch",
          block: batch.stacksBlock,
          newAnchors: newFlag(item, true),
          owner: ctx.owner,
        };
      }
    }
    if (
      typeof ctx?.groupId === "number" &&
      typeof ctx?.groupIndex === "number"
    ) {
      const groupAnchor = await getGroupAnchorAt(ctx.groupId, ctx.groupIndex);
      if (groupAnchor && groupAnchor.hash === item.value) {
        return {
          verified: true,
          source: "group",
          block: groupAnchor.stacksBlock,
          newAnchors: newFlag(item, true),
          groupId: ctx.groupId,
          groupIndex: ctx.groupIndex,
        };
      }
    }

    const single = await readAnchor(item.value);
    if (single) {
      return {
        verified: true,
        source: "single",
        block: single.stacksBlock,
        newAnchors: newFlag(item, true),
      };
    }
    const proof = await getProofByHash(item.value);
    if (proof) {
      return {
        verified: true,
        source: "proof",
        block: proof.stacksBlock,
        newAnchors: newFlag(item, true),
      };
    }
    return { verified: false, newAnchors: 0 };
  }

  if (item.type === "wallet") {
    const count = await getAnchorCount(item.value);
    const previous = item.lastStatus?.anchorCount ?? count;
    return {
      verified: count > 0,
      anchorCount: count,
      newAnchors: Math.max(0, count - previous),
    };
  }

  // group
  const groupId = Number(item.value);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return { verified: false, newAnchors: 0 };
  }
  const [group, count] = await Promise.all([
    getGroup(groupId),
    getGroupAnchorCount(groupId),
  ]);
  const previous = item.lastStatus?.anchorCount ?? count;
  return {
    verified: group !== null,
    anchorCount: count,
    newAnchors: Math.max(0, count - previous),
  };
}

// Resolves the current on-chain status of a single watch. The previous status
// carried on the item is used as the baseline for newAnchors, so a freshly
// added item never reports phantom updates on its first check. For a bare hash
// with no anchor in the hash-keyed contracts, it falls back to a full
// batch/group event scan. Prefer checkAllWatches for many items: it scans the
// event streams once instead of per hash.
export async function checkWatch(item: WatchItem): Promise<WatchStatus> {
  const cheap = await checkWatchCheap(item);
  if (item.type !== "hash" || cheap.verified) return cheap;
  const discovered = await discoverBatchAndGroupAnchors(
    [item.value],
    item.context?.owner ? { [item.value]: item.context.owner } : undefined,
  );
  const result = discovered.get(item.value);
  return result ? statusFromResult(item, result) : cheap;
}

// Stamps a freshly checked item with its status and, for a context-less hash,
// backfills the source keys the check discovered so its View link and later
// checks target the exact record.
export function applyCheck(item: WatchItem, status: WatchStatus): WatchItem {
  const next: WatchItem = {
    ...item,
    lastChecked: nowIso(),
    lastStatus: status,
  };
  if (item.type === "hash" && !item.context) {
    const ctx: WatchContext = {};
    if (status.owner) ctx.owner = status.owner;
    if (typeof status.groupId === "number") ctx.groupId = status.groupId;
    if (typeof status.groupIndex === "number") ctx.groupIndex = status.groupIndex;
    if (Object.keys(ctx).length > 0) next.context = ctx;
  }
  return next;
}

function shortenValue(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

// Builds the verify or detail link for a watched item, preferring source keys
// discovered during the check so the link targets the exact record.
function watchTargetUrl(item: WatchItem, status: WatchStatus): string {
  if (item.type === "wallet") return `/u/${item.value}`;
  if (item.type === "group") return `/groups/${item.value}`;
  const groupId = status.groupId ?? item.context?.groupId;
  const groupIndex = status.groupIndex ?? item.context?.groupIndex;
  if (groupId !== undefined && groupIndex !== undefined) {
    return `/v/${item.value}?group=${groupId}&gi=${groupIndex}`;
  }
  const owner = status.owner ?? item.context?.owner;
  if (owner) return `/v/${item.value}?owner=${encodeURIComponent(owner)}`;
  return `/v/${item.value}`;
}

// Emits a watchlist notification when an item's status changed meaningfully
// since the previous check: a watched hash became anchored, or a watched wallet
// or group gained anchors.
function notifyWatchChange(
  item: WatchItem,
  prior: WatchStatus | null,
  status: WatchStatus,
): void {
  const name = item.label || shortenValue(item.value);
  if (item.type === "hash") {
    // Only notify on a real transition observed while watching: require a prior
    // check that was not yet verified. A first check that finds the hash already
    // anchored is a baseline, not news.
    if (status.verified && prior !== null && prior.verified !== true) {
      addNotification({
        type: "watchlist_update",
        title: "Watched hash anchored",
        message: `${name} is now anchored on chain.`,
        icon: "watch",
        priority: "medium",
        actionUrl: watchTargetUrl(item, status),
        actionLabel: "Verify",
      });
    }
    return;
  }
  const gained = status.newAnchors ?? 0;
  if (gained > 0) {
    const noun = gained === 1 ? "anchor" : "anchors";
    addNotification({
      type: "watchlist_update",
      title:
        item.type === "group" ? "New group activity" : "New wallet activity",
      message: `${name} has ${gained} new ${noun}.`,
      icon: "watch",
      priority: "low",
      actionUrl: watchTargetUrl(item, status),
      actionLabel: "View",
    });
  }
}

// Checks every item, stamping lastChecked and lastStatus, and persists the
// result. The cheap per-item checks run first; any bare hash that is still
// unresolved is then resolved with a single shared batch/group event scan,
// rather than one scan per hash. An item whose check throws keeps its previous
// status but still has lastChecked advanced so the UI reflects the attempt. The
// optional onProgress reports completed cheap checks for a progress indicator.
export async function checkAllWatches(
  items: WatchItem[],
  onProgress?: (done: number, total: number) => void,
): Promise<WatchItem[]> {
  let done = 0;
  const total = items.length;
  const cheap = await Promise.all(
    items.map(async (item) => {
      let status: WatchStatus | null;
      try {
        status = await checkWatchCheap(item);
      } catch {
        status = null;
      }
      done += 1;
      onProgress?.(done, total);
      return { item, status };
    }),
  );

  // One shared event scan resolves every unresolved bare hash at once.
  const unresolved = cheap.filter(
    (c) => c.status !== null && c.item.type === "hash" && !c.status.verified,
  );
  let discovered = new Map<string, SearchResult>();
  // True if the shared event scan failed (a Hiro outage). When it did, an
  // unresolved hash is indeterminate, not "not found": we keep its previous
  // status rather than overwriting a verified batch/group watch.
  let discoveryFailed = false;
  if (unresolved.length > 0) {
    const owners: Record<string, string> = {};
    for (const u of unresolved) {
      if (u.item.context?.owner) owners[u.item.value] = u.item.context.owner;
    }
    try {
      discovered = await discoverBatchAndGroupAnchors(
        unresolved.map((u) => u.item.value),
        owners,
      );
    } catch {
      discoveryFailed = true;
    }
  }

  const checked = cheap.map(({ item, status }) => {
    // The cheap check itself failed: indeterminate, keep prior status.
    if (status === null) return { ...item, lastChecked: nowIso() };
    if (item.type === "hash" && !status.verified) {
      const result = discovered.get(item.value);
      if (result) return applyCheck(item, statusFromResult(item, result));
      // Scan failed, so we cannot conclude "not found": preserve prior status.
      if (discoveryFailed) return { ...item, lastChecked: nowIso() };
    }
    return applyCheck(item, status);
  });

  // Surface meaningful status changes as notifications, comparing each item's
  // fresh status against the snapshot this check started from.
  const priorById = new Map(items.map((i) => [i.id, i.lastStatus ?? null]));
  for (const item of checked) {
    if (item.notifications === false || !item.lastStatus) continue;
    notifyWatchChange(item, priorById.get(item.id) ?? null, item.lastStatus);
  }

  // Merge back into whatever the list is now, not the snapshot we started with,
  // so a concurrent add or remove (another tab, a watch button) is not clobbered
  // when these async checks finish.
  const merged = mergeChecked(checked);
  saveWatchlist(merged);
  return merged;
}

// Applies freshly checked items onto the current stored list by id. Items
// removed during the check are dropped (absent from the current list); items
// added during the check are preserved with their existing status.
export function mergeChecked(checked: WatchItem[]): WatchItem[] {
  const byId = new Map(checked.map((c) => [c.id, c]));
  return loadWatchlist().map((current) => byId.get(current.id) ?? current);
}

// Number of watched items reporting something new since the previous check,
// limited to items with notifications enabled. Drives the nav badge and widget.
export function countWatchUpdates(items: WatchItem[]): number {
  return items.filter(
    (i) => i.notifications && (i.lastStatus?.newAnchors ?? 0) > 0,
  ).length;
}
