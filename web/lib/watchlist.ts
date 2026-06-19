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
import { searchByHash } from "./search";

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

// Resolves the current on-chain status of a single watch. The previous status
// carried on the item is used as the baseline for newAnchors, so a freshly
// added item never reports phantom updates on its first check.
export async function checkWatch(item: WatchItem): Promise<WatchStatus> {
  const hadPrevious = item.lastStatus !== null;

  if (item.type === "hash") {
    const newFlag = (verified: boolean) =>
      hadPrevious && verified && !item.lastStatus?.verified ? 1 : 0;
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
          newAnchors: newFlag(true),
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
          newAnchors: newFlag(true),
        };
      }
    }

    const single = await readAnchor(item.value);
    if (single) {
      return {
        verified: true,
        source: "single",
        block: single.stacksBlock,
        newAnchors: newFlag(true),
      };
    }
    const proof = await getProofByHash(item.value);
    if (proof) {
      return {
        verified: true,
        source: "proof",
        block: proof.stacksBlock,
        newAnchors: newFlag(true),
      };
    }

    // No stored context and not a hash-keyed anchor: fall back to a full
    // cross-contract lookup so a later batch or group anchor of this bare hash
    // is still detected. searchByHash discovers batch owners from registry
    // events and group anchors from group events.
    const found = await searchByHash(item.value, item.context?.owner);
    if (found.length > 0) {
      const best = found[0]; // newest first
      const status: WatchStatus = {
        verified: true,
        source: best.source,
        block: best.stacksBlock,
        newAnchors: newFlag(true),
      };
      if (best.source === "batch") status.owner = best.owner;
      if (best.source === "group") {
        status.groupId = best.groupId;
        status.groupIndex = best.groupIndex;
      }
      return status;
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

// Checks every item, stamping lastChecked and lastStatus, and persists the
// result. An item whose check throws keeps its previous status but still has
// lastChecked advanced so the UI reflects the attempt.
export async function checkAllWatches(
  items: WatchItem[],
): Promise<WatchItem[]> {
  const checked = await Promise.all(
    items.map(async (item) => {
      try {
        const status = await checkWatch(item);
        return applyCheck(item, status);
      } catch {
        return { ...item, lastChecked: nowIso() };
      }
    }),
  );
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
