// Client-side tags: a lightweight, browser-local way to categorize anchors
// beyond their on-chain label or a collection. A tag is just a short string
// attached to a document hash; the same hash can carry several tags, and tags
// are shared across every page (verify, history, feed, search) so a user can
// filter their anchors however they think about them. Nothing here touches the
// chain or a server: tags live in localStorage, keyed by the normalized hash,
// exactly like collections and the watchlist.

import { parseLabel } from "./templates";

const STORAGE_KEY = "thesislock_tags";
// A separate, optional map of tag name to a chosen color, so the management page
// can override the derived color with an editable swatch without rewriting the
// per-anchor tag arrays.
const COLORS_KEY = "thesislock_tag_colors";
// First-seen timestamp per tag name, so the management page can show recently
// added tags. Kept in sync from saveTags; the per-anchor shape stays untouched.
const SEEN_KEY = "thesislock_tag_seen";
// Optional pinned verify path per tagged hash, recorded when a tag is added from
// a place that knows the exact record (an owner-keyed batch anchor or a group
// row), so the tags page links to the right record instead of a bare /v/<hash>.
const CONTEXT_KEY = "thesislock_tag_context";

// Dispatched on the window whenever the stored tags change, so the nav link,
// tag inputs, filters, and any open list stay in sync without a shared store.
export const TAGS_CHANGED_EVENT = "thesislock:tags-changed";

// A single anchor never carries an unbounded pile of tags, and a tag stays short
// enough to render as a pill and to key a color.
export const MAX_TAGS_PER_ANCHOR = 10;
export const MAX_TAG_LENGTH = 30;

// A unique tag with its rendering color and how many anchors carry it. Built on
// demand by getAllTags; the persisted shape is the per-anchor AnchorTags below.
export type Tag = {
  name: string;
  color: string;
  count: number;
};

export type AnchorTags = {
  hash: string;
  tags: string[];
};

// Twelve readable hues that work on both themes, used as the tag palette. Custom
// tags pick one deterministically from their name so the same tag is always the
// same color.
const PALETTE = [
  "#6366f1", // indigo
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#14b8a6", // teal
  "#22c55e", // green
  "#84cc16", // lime
  "#f59e0b", // amber
  "#f97316", // orange
  "#ef4444", // red
  "#f43f5e", // rose
  "#ec4899", // pink
  "#a855f7", // purple
];

// Preset colors for common tag names, including the ones suggestTags produces,
// so the defaults look intentional rather than randomly hued.
export const TAG_COLORS: Record<string, string> = {
  academic: "#6366f1",
  research: "#3b82f6",
  legal: "#a855f7",
  contract: "#f59e0b",
  compliance: "#ef4444",
  software: "#06b6d4",
  release: "#22c55e",
  dataset: "#84cc16",
  certificate: "#ec4899",
  draft: "#f97316",
  final: "#14b8a6",
  review: "#f43f5e",
};

// Hashes are normalized so a document tagged on one page matches the same
// document elsewhere, regardless of casing or a leading 0x. Mirrors the
// collections normalizer so the two features key anchors identically.
export function normalizeHash(hash: string): string {
  return hash.trim().toLowerCase().replace(/^0x/, "");
}

// Tags are lowercased and reduced to a url and color safe slug: spaces become
// dashes, anything else is dropped, and the result is capped. Returns "" for a
// value that has nothing usable left, which callers treat as "skip".
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TAG_LENGTH);
}

// A stable color for any tag: an explicit override wins, then a preset, then a
// hue chosen deterministically from the name so custom tags stay consistent.
export function getTagColor(tag: string): string {
  const name = normalizeTag(tag);
  if (!name) return PALETTE[0]!;
  const overrides = loadColorOverrides();
  if (overrides[name]) return overrides[name];
  if (TAG_COLORS[name]) return TAG_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]!;
}

// Sets or replaces a tag's color override, used by the editable swatch on the
// management page, so the new color shows everywhere the tag renders.
export function setTagColor(tag: string, color: string): void {
  const name = normalizeTag(tag);
  if (!name || typeof window === "undefined") return;
  try {
    const overrides = loadColorOverrides();
    overrides[name] = color;
    window.localStorage.setItem(COLORS_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent(TAGS_CHANGED_EVENT));
  } catch {
    // Color overrides are best-effort.
  }
}

// Validates one parsed entry, dropping anything without a usable hash and
// normalizing its tags, so older or hand-edited data stays renderable.
function coerceEntry(value: unknown): AnchorTags | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.hash !== "string" || !v.hash.trim()) return null;
  const tags = Array.isArray(v.tags)
    ? dedupe(
        v.tags
          .filter((t): t is string => typeof t === "string")
          .map(normalizeTag)
          .filter(Boolean),
      ).slice(0, MAX_TAGS_PER_ANCHOR)
    : [];
  return { hash: normalizeHash(v.hash), tags };
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

// localStorage is read defensively: it is unavailable during SSR and can throw
// in private-mode browsers, so every access is guarded.
export function loadTags(): AnchorTags[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(coerceEntry).filter((e): e is AnchorTags => e !== null && e.tags.length > 0);
  } catch {
    return [];
  }
}

export function saveTags(anchorTags: AnchorTags[]): void {
  if (typeof window === "undefined") return;
  // Only persist entries that still carry tags, so removing the last tag from an
  // anchor drops the row rather than leaving an empty husk.
  const pruned = anchorTags.filter((e) => e.tags.length > 0);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Persistence is best-effort; callers keep the in-memory list.
  }
  const present = new Set<string>();
  for (const entry of pruned) for (const tag of entry.tags) present.add(tag);
  syncSeen(present);
  syncContext(new Set(pruned.map((e) => e.hash)));
  try {
    window.dispatchEvent(new CustomEvent(TAGS_CHANGED_EVENT));
  } catch {
    // CustomEvent may be unavailable in some environments; non-fatal.
  }
}

function loadStringMap(key: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string") out[k] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function loadColorOverrides(): Record<string, string> {
  return loadStringMap(COLORS_KEY);
}

// Records a first-seen timestamp for any newly used tag and drops timestamps for
// tags no longer used, so the recently-added list reflects the live tag set.
function syncSeen(present: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    const seen = loadStringMap(SEEN_KEY);
    const now = new Date().toISOString();
    let changed = false;
    for (const name of present) {
      if (!seen[name]) {
        seen[name] = now;
        changed = true;
      }
    }
    for (const name of Object.keys(seen)) {
      if (!present.has(name)) {
        delete seen[name];
        changed = true;
      }
    }
    if (changed) window.localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // First-seen tracking is best-effort and never blocks a tag write.
  }
}

// A stored verify path must be a same-site /v/<hash> path for this very hash, so
// a hand-edited or stale value can never point a tag link off-site or at another
// document.
function isValidVerifyPath(hash: string, path: string): boolean {
  const prefix = `/v/${normalizeHash(hash)}`;
  return path === prefix || path.startsWith(`${prefix}?`);
}

// Records the pinned verify path for a tagged hash. Ignored unless the path is a
// valid verify path for this hash.
export function setTagContext(hash: string, verifyUrl: string): void {
  if (typeof window === "undefined") return;
  const key = normalizeHash(hash);
  if (!isValidVerifyPath(key, verifyUrl)) return;
  try {
    const map = loadStringMap(CONTEXT_KEY);
    if (map[key] === verifyUrl) return;
    map[key] = verifyUrl;
    window.localStorage.setItem(CONTEXT_KEY, JSON.stringify(map));
  } catch {
    // Best-effort; the tags page falls back to /v/<hash>.
  }
}

// Pinned verify paths for the given hashes, for linking to the exact record from
// the tags page. Only returns entries that still validate.
export function getTagContexts(hashes: string[]): Map<string, string> {
  const out = new Map<string, string>();
  if (hashes.length === 0) return out;
  const map = loadStringMap(CONTEXT_KEY);
  for (const h of hashes) {
    const key = normalizeHash(h);
    const path = map[key];
    if (path && isValidVerifyPath(key, path)) out.set(key, path);
  }
  return out;
}

// Drops pinned paths for hashes that no longer carry any tag, so the context map
// never outlives the tags it supports.
function syncContext(presentHashes: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    const map = loadStringMap(CONTEXT_KEY);
    let changed = false;
    for (const key of Object.keys(map)) {
      if (!presentHashes.has(key)) {
        delete map[key];
        changed = true;
      }
    }
    if (changed) window.localStorage.setItem(CONTEXT_KEY, JSON.stringify(map));
  } catch {
    // Non-fatal.
  }
}

// The tags on one anchor, normalized and capped. Empty when the hash is untagged.
export function getTagsForHash(hash: string): string[] {
  const key = normalizeHash(hash);
  const entry = loadTags().find((e) => e.hash === key);
  return entry ? entry.tags : [];
}

// Replaces the full tag set for one anchor. Tags are normalized, de-duplicated,
// and capped; an empty result removes the anchor's entry entirely.
export function setTagsForHash(hash: string, tags: string[]): void {
  const key = normalizeHash(hash);
  const next = dedupe(tags.map(normalizeTag).filter(Boolean)).slice(0, MAX_TAGS_PER_ANCHOR);
  const all = loadTags().filter((e) => e.hash !== key);
  if (next.length > 0) all.push({ hash: key, tags: next });
  saveTags(all);
}

export function addTag(hash: string, tag: string): void {
  const name = normalizeTag(tag);
  if (!name) return;
  const current = getTagsForHash(hash);
  if (current.includes(name) || current.length >= MAX_TAGS_PER_ANCHOR) return;
  setTagsForHash(hash, [...current, name]);
}

export function removeTag(hash: string, tag: string): void {
  const name = normalizeTag(tag);
  const current = getTagsForHash(hash);
  if (!current.includes(name)) return;
  setTagsForHash(
    hash,
    current.filter((t) => t !== name),
  );
}

// Moves any color override from one tag name to another, so a rename or merge
// keeps the chosen swatch on the surviving name.
function moveColorOverride(from: string, to: string): void {
  if (typeof window === "undefined") return;
  try {
    const overrides = loadColorOverrides();
    if (!overrides[from]) return;
    if (!overrides[to]) overrides[to] = overrides[from];
    delete overrides[from];
    window.localStorage.setItem(COLORS_KEY, JSON.stringify(overrides));
  } catch {
    // Non-fatal: the renamed tag just falls back to its derived color.
  }
}

// Renames a tag across every anchor that carries it, de-duplicating where the
// new name already coexists. A no-op for an empty or unchanged name.
export function renameTag(oldName: string, newName: string): void {
  const from = normalizeTag(oldName);
  const to = normalizeTag(newName);
  if (!from || !to || from === to) return;
  const all = loadTags().map((e) =>
    e.tags.includes(from)
      ? {
          hash: e.hash,
          tags: dedupe(e.tags.map((t) => (t === from ? to : t))).slice(0, MAX_TAGS_PER_ANCHOR),
        }
      : e,
  );
  moveColorOverride(from, to);
  saveTags(all);
}

// Removes a tag from every anchor that carries it.
export function deleteTag(tag: string): void {
  const name = normalizeTag(tag);
  if (!name) return;
  const all = loadTags().map((e) =>
    e.tags.includes(name) ? { hash: e.hash, tags: e.tags.filter((t) => t !== name) } : e,
  );
  saveTags(all);
}

// Merges one tag into another: every anchor tagged with source gains target and
// loses source. The target's color is kept.
export function mergeTags(source: string, target: string): void {
  const from = normalizeTag(source);
  const to = normalizeTag(target);
  if (!from || !to || from === to) return;
  const all = loadTags().map((e) =>
    e.tags.includes(from)
      ? {
          hash: e.hash,
          tags: dedupe(e.tags.map((t) => (t === from ? to : t))).slice(0, MAX_TAGS_PER_ANCHOR),
        }
      : e,
  );
  saveTags(all);
}

// Every distinct tag in use, with its color and the number of anchors carrying
// it, sorted by count (most used first) then alphabetically for a stable order.
export function getAllTags(): Tag[] {
  const counts = new Map<string, number>();
  for (const entry of loadTags()) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, color: getTagColor(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// The most recently added tags, newest first, for the management page. Limited
// to tags still in use so a removed-then-pruned tag does not linger.
export function getRecentTags(limit = 8): Tag[] {
  const seen = loadStringMap(SEEN_KEY);
  const byName = new Map(getAllTags().map((t) => [t.name, t]));
  return Object.keys(seen)
    .filter((name) => byName.has(name))
    .sort((a, b) => (seen[a]! < seen[b]! ? 1 : seen[a]! > seen[b]! ? -1 : 0))
    .slice(0, limit)
    .map((name) => byName.get(name)!);
}

// The hashes carrying a given tag, for filtering lists and feeds by tag.
export function getHashesByTag(tag: string): string[] {
  const name = normalizeTag(tag);
  if (!name) return [];
  return loadTags()
    .filter((e) => e.tags.includes(name))
    .map((e) => e.hash);
}

// Maps a detected template to its natural tags, so anchoring a paper offers
// "academic" and "research" without the user typing them.
const TEMPLATE_TAG_SUGGESTIONS: Record<string, string[]> = {
  paper: ["academic", "research"],
  legal: ["legal", "contract", "compliance"],
  release: ["software", "release"],
  dataset: ["dataset", "research"],
  certificate: ["certificate"],
};

// Free-form words worth surfacing as workflow tags when they appear in a label.
const CONTENT_KEYWORDS = [
  "draft",
  "final",
  "review",
  "published",
  "archived",
  "internal",
  "public",
];

// Suggests tags from a label: the template it parses to (by prefix) plus any
// recognized workflow keywords in its text. Normalized and de-duplicated.
export function suggestTags(label: string): string[] {
  const out: string[] = [];
  const parsed = parseLabel(label);
  if (parsed.templateId && TEMPLATE_TAG_SUGGESTIONS[parsed.templateId]) {
    out.push(...TEMPLATE_TAG_SUGGESTIONS[parsed.templateId]!);
  }
  const lower = label.toLowerCase();
  for (const keyword of CONTENT_KEYWORDS) {
    if (lower.includes(keyword)) out.push(keyword);
  }
  return dedupe(out.map(normalizeTag).filter(Boolean));
}
