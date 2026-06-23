// Client-side favorites. Users star hashes, wallets, groups, and pages they
// return to often; the list lives in the browser (localStorage) like the
// watchlist and collections, with no server component. A change event lets the
// favorites bar, the nav badge, and the star buttons stay in sync without prop
// drilling or a shared store.

const STORAGE_KEY = "thesislock_favorites";

// Dispatched on the window whenever the stored favorites change.
export const FAVORITES_CHANGED_EVENT = "thesislock:favorites-changed";

export type FavoriteType = "hash" | "wallet" | "group" | "page";

export type Favorite = {
  id: string;
  type: FavoriteType;
  value: string;
  label: string;
  // ISO timestamp.
  addedAt: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

// Short opaque id, independent of the favorited value.
function makeId(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    let out = "";
    for (const b of bytes) out += b.toString(16).padStart(2, "0");
    return out;
  }
  return `${nowIso()}-${String(Math.floor(Math.random() * 1e9))}`;
}

// Values are normalized so the same hash or wallet is never starred twice under
// different casing. Group ids and page paths are kept verbatim (trimmed).
function normalizeValue(type: FavoriteType, value: string): string {
  const trimmed = value.trim();
  if (type === "hash") return trimmed.toLowerCase().replace(/^0x/, "");
  if (type === "wallet") return trimmed.toUpperCase();
  return trimmed;
}

function defaultLabel(type: FavoriteType, value: string): string {
  if (type === "hash") {
    return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
  }
  if (type === "wallet") {
    return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;
  }
  if (type === "group") return `Group #${value}`;
  return value;
}

// localStorage is read defensively: it is unavailable during SSR and can throw
// in private-mode browsers, so every access is guarded.
export function loadFavorites(): Favorite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is Favorite =>
        !!f &&
        typeof (f as Favorite).id === "string" &&
        typeof (f as Favorite).type === "string" &&
        typeof (f as Favorite).value === "string",
    );
  } catch {
    return [];
  }
}

export function saveFavorites(favs: Favorite[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
  } catch {
    // Persistence is best-effort; callers keep the in-memory list.
  }
  try {
    window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT));
  } catch {
    // CustomEvent may be unavailable in some environments; non-fatal.
  }
}

// True when a value of the given type is already favorited.
export function isFavorite(type: string, value: string): boolean {
  const favType = type as FavoriteType;
  const normalized = normalizeValue(favType, value);
  return loadFavorites().some(
    (f) => f.type === favType && f.value === normalized,
  );
}

// Creates and persists a favorite, returning it. If the value is already
// favorited, the existing entry is returned and nothing is added.
export function addFavorite(
  type: FavoriteType,
  value: string,
  label: string,
): Favorite {
  const normalized = normalizeValue(type, value);
  const favs = loadFavorites();
  const existing = favs.find((f) => f.type === type && f.value === normalized);
  if (existing) return existing;
  const fav: Favorite = {
    id: makeId(),
    type,
    value: normalized,
    label: label.trim() || defaultLabel(type, normalized),
    addedAt: nowIso(),
  };
  saveFavorites([fav, ...favs]);
  return fav;
}

export function removeFavorite(id: string): void {
  saveFavorites(loadFavorites().filter((f) => f.id !== id));
}

// Adds the value if it is not favorited, or removes it if it is. Returns the new
// state: true when it is now a favorite, false when it was removed.
export function toggleFavorite(
  type: FavoriteType,
  value: string,
  label: string,
): boolean {
  const normalized = normalizeValue(type, value);
  const favs = loadFavorites();
  const existing = favs.find((f) => f.type === type && f.value === normalized);
  if (existing) {
    saveFavorites(favs.filter((f) => f.id !== existing.id));
    return false;
  }
  const fav: Favorite = {
    id: makeId(),
    type,
    value: normalized,
    label: label.trim() || defaultLabel(type, normalized),
    addedAt: nowIso(),
  };
  saveFavorites([fav, ...favs]);
  return true;
}

// The in-app destination for a favorite, by type.
export function favoriteHref(fav: Favorite): string {
  switch (fav.type) {
    case "hash":
      return `/v/${fav.value}`;
    case "wallet":
      return `/u/${fav.value}`;
    case "group":
      return `/groups/${fav.value}`;
    case "page":
      return fav.value.startsWith("/") ? fav.value : `/${fav.value}`;
  }
}
