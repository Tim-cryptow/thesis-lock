// Client-side watchlist. Users save document hashes, wallets, and groups they
// care about; the watchlist stores them in the browser and checks each one's
// on-chain status on demand. There is no server component: storage is
// localStorage and status checks read the public Hiro API directly, mirroring
// the rest of the app.

import {
  getAnchorCount,
  getGroup,
  getGroupAnchorCount,
  getProofByHash,
  readAnchor,
} from "./stacks";

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
};

export type WatchItem = {
  id: string;
  type: WatchType;
  value: string;
  label: string;
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
): WatchItem {
  const normalized = normalizeWatchValue(type, value);
  const items = loadWatchlist();
  const existing = items.find((i) => i.type === type && i.value === normalized);
  if (existing) return existing;

  const item: WatchItem = {
    id: makeId(),
    type,
    value: normalized,
    label: label?.trim() || defaultLabel(type, normalized),
    addedAt: nowIso(),
    lastChecked: null,
    lastStatus: null,
    notifications: true,
  };
  saveWatchlist([item, ...items]);
  return item;
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
    const single = await readAnchor(item.value);
    if (single) {
      return {
        verified: true,
        source: "single",
        block: single.stacksBlock,
        newAnchors: hadPrevious && !item.lastStatus?.verified ? 1 : 0,
      };
    }
    const proof = await getProofByHash(item.value);
    if (proof) {
      return {
        verified: true,
        source: "proof",
        block: proof.stacksBlock,
        newAnchors: hadPrevious && !item.lastStatus?.verified ? 1 : 0,
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
        return { ...item, lastChecked: nowIso(), lastStatus: status };
      } catch {
        return { ...item, lastChecked: nowIso() };
      }
    }),
  );
  saveWatchlist(checked);
  return checked;
}

// Number of watched items reporting something new since the previous check,
// limited to items with notifications enabled. Drives the nav badge and widget.
export function countWatchUpdates(items: WatchItem[]): number {
  return items.filter(
    (i) => i.notifications && (i.lastStatus?.newAnchors ?? 0) > 0,
  ).length;
}
