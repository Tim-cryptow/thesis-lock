// Client-side collections: a lightweight, browser-local way to organize the
// document anchors a user cares about into named folders ("playlists for
// anchors"). Unlike on-chain groups, collections are purely organizational and
// never touch the chain or a server: they live in localStorage and can be
// shared by encoding the whole collection into a link. Status of any hash is
// still resolved through the same public Hiro API the rest of the app uses.

const STORAGE_KEY = "thesislock_collections";

// Dispatched on the window whenever the stored collections change, so the nav
// link, add-to-collection buttons, and any open list stay in sync without a
// shared store or prop drilling.
export const COLLECTIONS_CHANGED_EVENT = "thesislock:collections-changed";

export type CollectionItem = {
  hash: string;
  label: string;
  // ISO timestamp.
  addedAt: string;
  note: string;
  // The exact verify-page path this item was collected from, when the hash
  // alone is not enough to reopen the right record: an owner-keyed batch anchor
  // (/v/<hash>?owner=...) or a specific group anchor (/v/<hash>?group=..&gi=..).
  // Always a same-site relative path; absent for plain single anchors.
  verifyUrl?: string;
};

export type Collection = {
  id: string;
  name: string;
  description: string;
  // One of COLLECTION_COLORS keys.
  color: string;
  // One of COLLECTION_ICONS (an emoji).
  icon: string;
  items: CollectionItem[];
  // ISO timestamps.
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
};

// Eight preset colors. Each maps to the Tailwind classes used to render the
// card's top border, icon chip, and accents, so the palette stays consistent
// and no arbitrary color strings leak into the UI.
export type CollectionColor = {
  id: string;
  name: string;
  // Solid background (border bar, swatch).
  bar: string;
  // Tinted background for the icon chip.
  chip: string;
  // Text/accent color.
  text: string;
};

export const COLLECTION_COLORS: CollectionColor[] = [
  { id: "blue", name: "Blue", bar: "bg-blue-500", chip: "bg-blue-500/15", text: "text-blue-500" },
  { id: "green", name: "Green", bar: "bg-green-500", chip: "bg-green-500/15", text: "text-green-500" },
  { id: "red", name: "Red", bar: "bg-red-500", chip: "bg-red-500/15", text: "text-red-500" },
  { id: "purple", name: "Purple", bar: "bg-purple-500", chip: "bg-purple-500/15", text: "text-purple-500" },
  { id: "orange", name: "Orange", bar: "bg-orange-500", chip: "bg-orange-500/15", text: "text-orange-500" },
  { id: "teal", name: "Teal", bar: "bg-teal-500", chip: "bg-teal-500/15", text: "text-teal-500" },
  { id: "pink", name: "Pink", bar: "bg-pink-500", chip: "bg-pink-500/15", text: "text-pink-500" },
  { id: "gray", name: "Gray", bar: "bg-gray-500", chip: "bg-gray-500/15", text: "text-gray-500" },
];

// Eight preset icons as emoji. Kept as plain strings so a shared collection
// serializes cleanly and renders anywhere without an icon font.
export const COLLECTION_ICONS = ["📄", "📁", "🔬", "⚖️", "💻", "🎓", "🏥", "📊"];

export const DEFAULT_COLOR = COLLECTION_COLORS[0].id;
export const DEFAULT_ICON = COLLECTION_ICONS[1];

// Resolves a stored color id to its class set, falling back to the first preset
// so an unknown or hand-edited color never renders blank.
export function resolveColor(id: string): CollectionColor {
  return COLLECTION_COLORS.find((c) => c.id === id) ?? COLLECTION_COLORS[0];
}

function nowIso(): string {
  return new Date().toISOString();
}

// Short opaque id, independent of the collection's name.
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

// Hashes are normalized so the same document is never added twice under
// different casing or with a 0x prefix.
export function normalizeHash(hash: string): string {
  return hash.trim().toLowerCase().replace(/^0x/, "");
}

// Validates one parsed item, dropping anything without a usable hash. Missing
// optional fields are defaulted so older or hand-edited data stays renderable.
function coerceItem(value: unknown): CollectionItem | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.hash !== "string" || !v.hash.trim()) return null;
  const hash = normalizeHash(v.hash);
  return {
    hash,
    label: typeof v.label === "string" ? v.label : "",
    addedAt: typeof v.addedAt === "string" ? v.addedAt : nowIso(),
    note: typeof v.note === "string" ? v.note : "",
    // Only accept a same-site /v/ path whose hash matches this item's. A crafted
    // share could otherwise show hash A's status on a row whose Verify link
    // opens hash B, or smuggle an off-site link into a Verify button.
    ...(typeof v.verifyUrl === "string" && verifyPathHash(v.verifyUrl) === hash
      ? { verifyUrl: v.verifyUrl }
      : {}),
  };
}

// The 64-hex hash of a same-site verify path like /v/<hash> or /v/<hash>?owner=,
// or null when the value is not such a path. Requiring the leading "/v/" keeps a
// stored or imported value from being an absolute or protocol-relative URL that
// a Link would treat as an external redirect.
function verifyPathHash(url: string): string | null {
  const m = /^\/v\/([0-9a-f]{64})(?:\?|$)/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

// The path a Verify link or CSV row should use for an item: the pinned source
// path when present and matching this item's hash, otherwise the bare
// single-anchor page.
export function itemVerifyHref(item: CollectionItem): string {
  return item.verifyUrl && verifyPathHash(item.verifyUrl) === item.hash
    ? item.verifyUrl
    : `/v/${item.hash}`;
}

// The owner principal or specific group row pinned by an item's verify path.
// Used to carry per-item context into the report builder and bulk verifier so
// they resolve the exact record the item was collected from (an owner-keyed
// batch anchor, or a precise { group-id, index } group row) instead of a global
// single anchor that may describe a different owner/label/block for the hash.
export type ItemVerifyContext = {
  owner?: string;
  groupId?: number;
  groupIndex?: number;
};

export function itemVerifyContext(item: CollectionItem): ItemVerifyContext {
  if (!item.verifyUrl || verifyPathHash(item.verifyUrl) !== item.hash) return {};
  const ctx: ItemVerifyContext = {};
  const ownerMatch = /[?&]owner=([^&]+)/.exec(item.verifyUrl);
  if (ownerMatch) ctx.owner = decodeURIComponent(ownerMatch[1]);
  const groupMatch = /[?&]group=(\d+)(?:&|$)/.exec(item.verifyUrl);
  const indexMatch = /[?&]gi=(\d+)(?:&|$)/.exec(item.verifyUrl);
  if (groupMatch && indexMatch) {
    ctx.groupId = Number(groupMatch[1]);
    ctx.groupIndex = Number(indexMatch[1]);
  }
  return ctx;
}

// Convenience accessor for the pinned owner principal alone.
export function itemOwner(item: CollectionItem): string | undefined {
  return itemVerifyContext(item).owner;
}

// Validates and normalizes a parsed collection, returning null when it lacks the
// fields that make it usable. Used by both loadCollections and importCollection.
function coerceCollection(value: unknown): Collection | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;
  const items = Array.isArray(v.items)
    ? v.items.map(coerceItem).filter((i): i is CollectionItem => i !== null)
    : [];
  return {
    id: v.id,
    name: v.name,
    description: typeof v.description === "string" ? v.description : "",
    color: typeof v.color === "string" ? v.color : DEFAULT_COLOR,
    icon: typeof v.icon === "string" ? v.icon : DEFAULT_ICON,
    items,
    createdAt: typeof v.createdAt === "string" ? v.createdAt : nowIso(),
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : nowIso(),
    isPublic: v.isPublic === true,
  };
}

// localStorage is read defensively: it is unavailable during SSR and can throw
// in private-mode browsers, so every access is guarded.
export function loadCollections(): Collection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(coerceCollection)
      .filter((c): c is Collection => c !== null);
  } catch {
    return [];
  }
}

export function saveCollections(collections: Collection[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  } catch {
    // Persistence is best-effort; callers keep the in-memory list.
  }
  try {
    window.dispatchEvent(new CustomEvent(COLLECTIONS_CHANGED_EVENT));
  } catch {
    // CustomEvent may be unavailable in some environments; non-fatal.
  }
}

export function getCollection(id: string): Collection | undefined {
  return loadCollections().find((c) => c.id === id);
}

// Builds, persists, and returns a new (empty) collection. Newest first, matching
// the rest of the app's lists.
export function createCollection(
  name: string,
  description: string,
  color: string,
  icon: string,
): Collection {
  const ts = nowIso();
  const collection: Collection = {
    id: makeId(),
    name: name.trim(),
    description: description.trim(),
    color: COLLECTION_COLORS.some((c) => c.id === color) ? color : DEFAULT_COLOR,
    icon: COLLECTION_ICONS.includes(icon) ? icon : DEFAULT_ICON,
    items: [],
    createdAt: ts,
    updatedAt: ts,
    isPublic: false,
  };
  saveCollections([collection, ...loadCollections()]);
  return collection;
}

// Applies a partial update to a collection by id, stamping updatedAt. Used for
// inline name/description edits, color/icon changes, and the public toggle.
export function updateCollection(
  id: string,
  patch: Partial<Omit<Collection, "id" | "items" | "createdAt">>,
): void {
  saveCollections(
    loadCollections().map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c,
    ),
  );
}

export function deleteCollection(id: string): void {
  saveCollections(loadCollections().filter((c) => c.id !== id));
}

// Adds a hash to a collection. A hash already present is left in place but its
// note is updated when a new one is given, so re-adding from a different page
// can annotate without duplicating.
export function addToCollection(
  collectionId: string,
  hash: string,
  label: string,
  note?: string,
  verifyUrl?: string,
): void {
  const normalized = normalizeHash(hash);
  if (!normalized) return;
  const pinned =
    verifyUrl && verifyPathHash(verifyUrl) === normalized ? verifyUrl : undefined;
  saveCollections(
    loadCollections().map((c) => {
      if (c.id !== collectionId) return c;
      const existing = c.items.find((i) => i.hash === normalized);
      if (existing) {
        // Re-adding from another page can fill in a note or backfill the pinned
        // verify path if the item was first added without one.
        const items = c.items.map((i) =>
          i.hash === normalized
            ? {
                ...i,
                note: note?.trim() ? note.trim() : i.note,
                ...(pinned && !i.verifyUrl ? { verifyUrl: pinned } : {}),
              }
            : i,
        );
        return { ...c, items, updatedAt: nowIso() };
      }
      const item: CollectionItem = {
        hash: normalized,
        label: label.trim(),
        addedAt: nowIso(),
        note: note?.trim() ?? "",
        ...(pinned ? { verifyUrl: pinned } : {}),
      };
      return { ...c, items: [item, ...c.items], updatedAt: nowIso() };
    }),
  );
}

export function removeFromCollection(collectionId: string, hash: string): void {
  const normalized = normalizeHash(hash);
  saveCollections(
    loadCollections().map((c) =>
      c.id === collectionId
        ? {
            ...c,
            items: c.items.filter((i) => i.hash !== normalized),
            updatedAt: nowIso(),
          }
        : c,
    ),
  );
}

// Updates the free-form note on one item.
export function setItemNote(
  collectionId: string,
  hash: string,
  note: string,
): void {
  const normalized = normalizeHash(hash);
  saveCollections(
    loadCollections().map((c) =>
      c.id === collectionId
        ? {
            ...c,
            items: c.items.map((i) =>
              i.hash === normalized ? { ...i, note } : i,
            ),
            updatedAt: nowIso(),
          }
        : c,
    ),
  );
}

// Moves one item between two collections in a single write, preserving its
// label, note, and added time. A no-op if the source lacks the hash or the
// destination already has it.
export function moveItem(
  fromCollectionId: string,
  toCollectionId: string,
  hash: string,
): void {
  const normalized = normalizeHash(hash);
  if (fromCollectionId === toCollectionId) return;
  const collections = loadCollections();
  const from = collections.find((c) => c.id === fromCollectionId);
  const item = from?.items.find((i) => i.hash === normalized);
  if (!item) return;
  saveCollections(
    collections.map((c) => {
      if (c.id === fromCollectionId) {
        return {
          ...c,
          items: c.items.filter((i) => i.hash !== normalized),
          updatedAt: nowIso(),
        };
      }
      if (c.id === toCollectionId) {
        if (c.items.some((i) => i.hash === normalized)) return c;
        return { ...c, items: [item, ...c.items], updatedAt: nowIso() };
      }
      return c;
    }),
  );
}

// Shifts an item one slot up or down within its collection. Drag-to-reorder is
// expressed as simple up/down moves so it works without a drag library.
export function reorderItem(
  collectionId: string,
  hash: string,
  direction: "up" | "down",
): void {
  const normalized = normalizeHash(hash);
  saveCollections(
    loadCollections().map((c) => {
      if (c.id !== collectionId) return c;
      const index = c.items.findIndex((i) => i.hash === normalized);
      if (index < 0) return c;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= c.items.length) return c;
      const items = [...c.items];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...c, items, updatedAt: nowIso() };
    }),
  );
}

// Ids of the collections that already contain a given hash. Drives the checked
// state on the add-to-collection dropdown.
export function collectionsContaining(hash: string): string[] {
  const normalized = normalizeHash(hash);
  return loadCollections()
    .filter((c) => c.items.some((i) => i.hash === normalized))
    .map((c) => c.id);
}

// Pretty-printed JSON of a single collection, for the Export action and as the
// payload that gets base64-encoded into a share link.
export function exportCollection(collection: Collection): string {
  return JSON.stringify(collection, null, 2);
}

// Parses a collection from JSON, assigning a fresh id and timestamps so an
// imported (or shared) collection never collides with or overwrites an existing
// one, and persists it. Throws on malformed input so callers can show an error.
export function importCollection(json: string): Collection {
  const parsed: unknown = JSON.parse(json);
  const coerced = coerceCollection(parsed);
  if (!coerced) throw new Error("Not a valid collection.");
  const ts = nowIso();
  const collection: Collection = {
    ...coerced,
    id: makeId(),
    createdAt: ts,
    updatedAt: ts,
    isPublic: false,
  };
  saveCollections([collection, ...loadCollections()]);
  return collection;
}

// base64url (RFC 4648 §5) is URL-safe: no `+`, `/`, or `=`, which a query string
// would otherwise mangle (URLSearchParams turns `+` into a space before we ever
// reach atob). Encoding to base64url keeps share links round-tripping intact.
function toBase64Url(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  // Standard atob/Buffer want padding; restore it. (Also tolerates a legacy
  // standard-base64 payload, which has no `-`/`_` and arrives already padded.)
  return b64 + "=".repeat((4 - (b64.length % 4)) % 4);
}

// Encodes a collection into a URL-safe base64url string for a share link, and
// the inverse for the shared viewer. Unicode-safe (collections hold emoji and
// free text), so we round-trip the bytes through TextEncoder/TextDecoder.
export function encodeCollection(collection: Collection): string {
  const json = JSON.stringify(collection);
  if (typeof window === "undefined") {
    return toBase64Url(Buffer.from(json, "utf-8").toString("base64"));
  }
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return toBase64Url(window.btoa(binary));
}

export function decodeCollection(encoded: string): Collection | null {
  try {
    const padded = fromBase64Url(encoded);
    let json: string;
    if (typeof window === "undefined") {
      json = Buffer.from(padded, "base64").toString("utf-8");
    } else {
      const binary = window.atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      json = new TextDecoder().decode(bytes);
    }
    return coerceCollection(JSON.parse(json) as unknown);
  } catch {
    return null;
  }
}

// Total item count across all collections. Drives the nav badge.
export function totalItemCount(collections: Collection[]): number {
  return collections.reduce((sum, c) => sum + c.items.length, 0);
}
