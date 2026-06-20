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
  if (!name) return PALETTE[0];
  const overrides = loadColorOverrides();
  if (overrides[name]) return overrides[name];
  if (TAG_COLORS[name]) return TAG_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
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
    return parsed
      .map(coerceEntry)
      .filter((e): e is AnchorTags => e !== null && e.tags.length > 0);
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
  const next = dedupe(tags.map(normalizeTag).filter(Boolean)).slice(
    0,
    MAX_TAGS_PER_ANCHOR,
  );
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
    .sort((a, b) => (seen[a] < seen[b] ? 1 : seen[a] > seen[b] ? -1 : 0))
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
    out.push(...TEMPLATE_TAG_SUGGESTIONS[parsed.templateId]);
  }
  const lower = label.toLowerCase();
  for (const keyword of CONTENT_KEYWORDS) {
    if (lower.includes(keyword)) out.push(keyword);
  }
  return dedupe(out.map(normalizeTag).filter(Boolean));
}
