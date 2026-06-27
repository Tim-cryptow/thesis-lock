// Backup, restore, and storage utilities for everything ThesisLock keeps in the
// browser. The app stores user data across many localStorage keys under two
// prefixes: most use "thesislock_" but a few (theme, notifications, performance,
// locale, and other UI state) use "thesislock.". This module treats both as the
// app namespace so a backup captures the whole picture and nothing is silently
// dropped. There is no server involved; the device is the only source of truth.

import { getStxAddress } from "@/lib/wallet";

// Bumped only on a breaking change to the backup shape. Restores check the major
// version for compatibility.
export const EXPORT_VERSION = "1.0.0";

// Remind the user to back up once their last backup is at least this old.
export const BACKUP_REMINDER_DAYS = 30;

// Stores the ISO timestamp of the most recent successful export.
const LAST_BACKUP_KEY = "thesislock_last_backup";

export type UserDataExport = {
  version: string;
  exportedAt: string;
  exportedBy: string | null;
  data: {
    collections: unknown;
    tags: unknown;
    watchlist: unknown;
    apiKeys: unknown;
    auditLog: unknown;
    notificationPreferences: unknown;
    webhookSubscriptions: unknown;
    theme: unknown;
    tourComplete: unknown;
    recentSearches: unknown;
    requestHistory: unknown;
    performanceData: unknown;
    statusHistory: unknown;
    customSettings: unknown;
  };
};

export type Category = keyof UserDataExport["data"];

// Known keys grouped into the export categories. Anything prefixed but not
// listed here lands in customSettings, so new keys are never lost from a backup.
const CATEGORY_KEYS: Record<Exclude<Category, "customSettings">, string[]> = {
  collections: ["thesislock_collections"],
  tags: [
    "thesislock_tags",
    "thesislock_tag_colors",
    "thesislock_tag_seen",
    "thesislock_tag_context",
  ],
  watchlist: ["thesislock_watchlist", "thesislock_watchlist_autocheck"],
  apiKeys: ["thesislock_api_keys"],
  auditLog: ["thesislock_audit_log", "thesislock_audit_session", "thesislock_audit_integrity"],
  notificationPreferences: ["thesislock.notifications.prefs", "thesislock.notifications"],
  webhookSubscriptions: ["thesislock_webhooks"],
  theme: ["thesislock.theme"],
  tourComplete: ["thesislock_tour_complete"],
  recentSearches: ["thesislock.search.recent", "thesislock_recent"],
  requestHistory: ["thesislock.playground.history"],
  performanceData: [
    "thesislock.perf.vitals",
    "thesislock.perf.pages",
    "thesislock.perf.api",
    "thesislock_perf_debug",
  ],
  statusHistory: ["thesislock_status_history", "thesislock_status_overall"],
};

// Human-readable names for the storage breakdown and clear controls.
export const CATEGORY_LABELS: Record<Category, string> = {
  collections: "Collections",
  tags: "Tags",
  watchlist: "Watchlist",
  apiKeys: "API keys",
  auditLog: "Audit log",
  notificationPreferences: "Notifications",
  webhookSubscriptions: "Webhooks",
  theme: "Theme",
  tourComplete: "Onboarding tour",
  recentSearches: "Recent searches",
  requestHistory: "API request history",
  performanceData: "Performance data",
  statusHistory: "Status history",
  customSettings: "Other settings",
};

// Short explanation of what each category holds, for the privacy disclosure.
export const CATEGORY_DESCRIPTIONS: Record<Category, string> = {
  collections: "Named folders of anchored documents you have organized.",
  tags: "Labels you have applied to anchors, plus their colors.",
  watchlist: "Hashes, wallets, and groups you are monitoring.",
  apiKeys: "Scoped API keys you created in the developer portal.",
  auditLog: "The tamper-evident record of actions you have taken.",
  notificationPreferences: "Your notification history and per-type alert preferences.",
  webhookSubscriptions: "Webhook endpoints you registered for protocol events.",
  theme: "Your light, dark, or system theme choice.",
  tourComplete: "Whether you have completed the onboarding tour.",
  recentSearches: "Recent search terms and command palette history.",
  requestHistory: "Past requests made in the developer API playground.",
  performanceData: "In-browser Web Vitals and timing metrics.",
  statusHistory: "Cached results from the system status checks.",
  customSettings: "Other interface preferences such as language and live updates.",
};

// Arrays are unioned on a merge import. The audit log is the one exception: its
// integrity hash is computed over the exact log contents, so merging entries
// from another device would break tamper detection. On merge it is kept as-is;
// a replace import overwrites the log and its hash together.
const NO_MERGE_KEYS = new Set(["thesislock_audit_log"]);

// A few user-data categories live in sessionStorage rather than localStorage
// (recent searches and the API request history). They are still part of the app
// namespace, so they must be backed up, restored, and cleared from the right
// store. Transient handoff keys and one-shot UI flags in sessionStorage are
// deliberately excluded: they are not data worth porting.
const SESSION_KEYS = new Set([
  "thesislock.search.recent",
  "thesislock_recent",
  "thesislock.playground.history",
]);

// The Storage that actually holds a given key.
function storeFor(key: string): Storage {
  return SESSION_KEYS.has(key) ? window.sessionStorage : window.localStorage;
}

const KEY_TO_CATEGORY = new Map<string, Category>();
for (const [category, keys] of Object.entries(CATEGORY_KEYS)) {
  for (const key of keys) KEY_TO_CATEGORY.set(key, category as Category);
}

function isThesisLockKey(key: string): boolean {
  return key.startsWith("thesislock_") || key.startsWith("thesislock.");
}

export function categoryForKey(key: string): Category {
  return KEY_TO_CATEGORY.get(key) ?? "customSettings";
}

function emptyData(): UserDataExport["data"] {
  return {
    collections: {},
    tags: {},
    watchlist: {},
    apiKeys: {},
    auditLog: {},
    notificationPreferences: {},
    webhookSubscriptions: {},
    theme: {},
    tourComplete: {},
    recentSearches: {},
    requestHistory: {},
    performanceData: {},
    statusHistory: {},
    customSettings: {},
  };
}

// Parse a stored value back into JSON when possible, otherwise keep the raw
// string (some values, such as the theme, are plain strings).
function readValue(key: string): unknown {
  let raw: string | null = null;
  try {
    raw = storeFor(key).getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function writeValue(key: string, value: unknown): void {
  const raw = typeof value === "string" ? value : JSON.stringify(value);
  storeFor(key).setItem(key, raw);
}

function safeAddress(): string | null {
  try {
    return getStxAddress();
  } catch {
    return null;
  }
}

// Let any open part of the app refresh after a bulk import or clear.
function notifyChange(): void {
  if (typeof window === "undefined") return;
  for (const name of [
    "thesislock:data-changed",
    "thesislock:notifications-changed",
    "thesislock:audit-changed",
  ]) {
    try {
      window.dispatchEvent(new CustomEvent(name));
    } catch {
      // CustomEvent may be unavailable in exotic environments; non-fatal.
    }
  }
}

function majorVersion(version: string): string {
  return (version || "").split(".")[0];
}

function isCompatible(version: string): boolean {
  return majorVersion(version) === majorVersion(EXPORT_VERSION);
}

/**
 * Every key in the ThesisLock namespace, both prefixes, sorted. Scans
 * localStorage for all namespaced keys, plus the known session-backed data keys
 * in sessionStorage, so a backup captures everything the app stores.
 */
export function getAllLocalStorageKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys = new Set<string>();
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && isThesisLockKey(key)) keys.add(key);
    }
  } catch {
    // localStorage may be unavailable (private mode); continue.
  }
  try {
    for (const key of SESSION_KEYS) {
      if (window.sessionStorage.getItem(key) !== null) keys.add(key);
    }
  } catch {
    // sessionStorage may be unavailable; continue.
  }
  return [...keys].sort();
}

/** Read every namespaced key into a single structured, versioned object. */
export function exportAllData(): UserDataExport {
  const data = emptyData();
  if (typeof window !== "undefined") {
    for (const key of getAllLocalStorageKeys()) {
      const bucket = data[categoryForKey(key)] as Record<string, unknown>;
      bucket[key] = readValue(key);
    }
  }
  return {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy: safeAddress(),
    data,
  };
}

// Flatten the category buckets back into real key/value pairs. Only namespaced
// keys are accepted so a tampered file can never write outside our namespace.
function flattenData(data: UserDataExport["data"]): Array<[string, unknown]> {
  const out: Array<[string, unknown]> = [];
  for (const bucket of Object.values(data)) {
    if (!bucket || typeof bucket !== "object") continue;
    for (const [key, value] of Object.entries(bucket as Record<string, unknown>)) {
      if (isThesisLockKey(key)) out.push([key, value]);
    }
  }
  return out;
}

// Identity for matching object rows across a merge: collections by id, tag rows
// and collection items by hash, then name. Returns null for primitives (such as
// tag strings), which are de-duped by value instead.
function rowKey(item: unknown): string | null {
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if (typeof obj.id === "string") return `id:${obj.id}`;
    if (typeof obj.hash === "string") return `hash:${obj.hash}`;
    if (typeof obj.name === "string") return `name:${obj.name}`;
  }
  return null;
}

// Combine two matched object rows: union array-valued fields (collection items,
// tag lists) and fill in fields the existing row is missing, otherwise keep the
// existing scalar. This is what makes a same-id collection or same-hash tag row
// actually merge rather than be skipped or duplicated.
function mergeRow(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...existing };
  for (const [field, value] of Object.entries(incoming)) {
    const current = out[field];
    if (Array.isArray(current) && Array.isArray(value)) {
      out[field] = mergeArrays(current, value);
    } else if (current === undefined) {
      out[field] = value;
    }
  }
  return out;
}

// Union two arrays for a merge import. Object rows that share an identity are
// merged field by field; keyless rows and primitives are de-duped by value.
function mergeArrays(existing: unknown, incoming: unknown): unknown {
  if (!Array.isArray(existing)) return Array.isArray(incoming) ? incoming : existing;
  if (!Array.isArray(incoming)) return existing;
  const result: unknown[] = [...existing];
  const indexByKey = new Map<string, number>();
  const seenValues = new Set<string>();
  result.forEach((item, i) => {
    const key = rowKey(item);
    if (key) indexByKey.set(key, i);
    else seenValues.add(`v:${JSON.stringify(item)}`);
  });
  for (const item of incoming) {
    const key = rowKey(item);
    if (key && indexByKey.has(key)) {
      const at = indexByKey.get(key)!;
      result[at] = mergeRow(result[at] as Record<string, unknown>, item as Record<string, unknown>);
    } else if (key) {
      indexByKey.set(key, result.length);
      result.push(item);
    } else {
      const value = `v:${JSON.stringify(item)}`;
      if (!seenValues.has(value)) {
        seenValues.add(value);
        result.push(item);
      }
    }
  }
  return result;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Restore a backup. "replace" wipes the namespace first and writes everything;
 * "merge" keeps existing data, writes keys that do not exist, and unions any
 * array-valued key (collections, tags, watchlist, and the rest) with what is
 * already there. The audit log is never merged so its integrity stays intact.
 * Returns a per-run summary.
 */
export function importAllData(
  data: UserDataExport,
  mode: "merge" | "replace",
): { imported: number; skipped: number; errors: string[] } {
  const result = { imported: 0, skipped: 0, errors: [] as string[] };
  if (typeof window === "undefined") {
    result.errors.push("Storage is not available in this environment.");
    return result;
  }
  if (!data || typeof data !== "object" || !data.data || typeof data.data !== "object") {
    result.errors.push("The backup is missing its data section.");
    return result;
  }
  if (!isCompatible(data.version)) {
    result.errors.push(
      `Incompatible backup version ${data.version || "unknown"} (expected ${majorVersion(EXPORT_VERSION)}.x).`,
    );
    return result;
  }

  const entries = flattenData(data.data);
  if (mode === "replace") clearAllData();

  for (const [key, value] of entries) {
    try {
      if (mode === "replace") {
        writeValue(key, value);
        result.imported++;
        continue;
      }
      const existing = storeFor(key).getItem(key);
      if (existing === null) {
        writeValue(key, value);
        result.imported++;
        continue;
      }
      const existingValue = safeParse(existing);
      if (!NO_MERGE_KEYS.has(key) && Array.isArray(existingValue) && Array.isArray(value)) {
        // Both sides are arrays: union them, combining rows that share an
        // identity so existing data is kept and new items are added.
        writeValue(key, mergeArrays(existingValue, value));
        result.imported++;
      } else {
        // Existing scalar/object value, or a no-merge key: keep what is here.
        result.skipped++;
      }
    } catch (e) {
      result.errors.push(`${key}: ${e instanceof Error ? e.message : "could not be written"}`);
    }
  }

  notifyChange();
  return result;
}

/** Remove specific keys. Returns how many were removed. */
export function clearKeys(keys: string[]): { cleared: number } {
  if (typeof window === "undefined") return { cleared: 0 };
  let cleared = 0;
  for (const key of keys) {
    try {
      const store = storeFor(key);
      if (store.getItem(key) !== null) {
        store.removeItem(key);
        cleared++;
      }
    } catch {
      // Skip keys that cannot be removed; continue with the rest.
    }
  }
  if (cleared > 0) notifyChange();
  return { cleared };
}

/** Remove every key currently belonging to a category. */
export function clearCategory(category: Category): { cleared: number } {
  const keys = getAllLocalStorageKeys().filter((key) => categoryForKey(key) === category);
  return clearKeys(keys);
}

/** Remove all namespaced data from the browser. */
export function clearAllData(): { cleared: number } {
  return clearKeys(getAllLocalStorageKeys());
}

/** Per-key and total localStorage usage, largest first. */
export function getStorageUsage(): {
  totalKeys: number;
  totalSize: number;
  breakdown: Array<{ key: string; size: number }>;
} {
  const breakdown: Array<{ key: string; size: number }> = [];
  let totalSize = 0;
  if (typeof window !== "undefined") {
    for (const key of getAllLocalStorageKeys()) {
      let raw = "";
      try {
        raw = storeFor(key).getItem(key) ?? "";
      } catch {
        raw = "";
      }
      // Browser storage holds UTF-16, so two bytes per code unit is a fair
      // estimate of the space used.
      const size = (key.length + raw.length) * 2;
      breakdown.push({ key, size });
      totalSize += size;
    }
  }
  breakdown.sort((a, b) => b.size - a.size);
  return { totalKeys: breakdown.length, totalSize, breakdown };
}

/** Trigger a JSON download named thesislock-backup-YYYY-MM-DD.json. */
export function downloadExport(data: UserDataExport): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `thesislock-backup-${data.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  markBackedUp();
}

/** Validate a backup string and summarize it for a restore preview. */
export function validateImport(json: string): {
  valid: boolean;
  version: string;
  dataKeys: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {
      valid: false,
      version: "",
      dataKeys: [],
      warnings: ["The file is not valid JSON."],
    };
  }
  if (!parsed || typeof parsed !== "object") {
    return {
      valid: false,
      version: "",
      dataKeys: [],
      warnings: ["The file is not a ThesisLock backup."],
    };
  }

  const obj = parsed as Partial<UserDataExport>;
  const version = typeof obj.version === "string" ? obj.version : "";
  if (!version) {
    warnings.push("No version field found; this may not be a ThesisLock backup.");
  } else if (!isCompatible(version)) {
    warnings.push(
      `Backup version ${version} may be incompatible (this app expects ${majorVersion(EXPORT_VERSION)}.x).`,
    );
  }

  const data = obj.data;
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      version,
      dataKeys: [],
      warnings: [...warnings, "The backup has no data section."],
    };
  }

  const dataKeys: string[] = [];
  let totalEntries = 0;
  for (const [category, bucket] of Object.entries(data)) {
    if (bucket && typeof bucket === "object") {
      const count = Object.keys(bucket as Record<string, unknown>).length;
      if (count > 0) {
        dataKeys.push(category);
        totalEntries += count;
      }
    }
  }
  if (totalEntries === 0) warnings.push("This backup does not contain any data.");

  return { valid: true, version, dataKeys, warnings };
}

/** Record that a backup was just taken. */
export function markBackedUp(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch {
    // Non-fatal if persistence is unavailable.
  }
}

/** ISO timestamp of the last backup, or null if there has never been one. */
export function getLastBackup(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

/** Whole days since the last backup, or null if there has never been one. */
export function daysSinceBackup(): number | null {
  const last = getLastBackup();
  if (!last) return null;
  const then = new Date(last).getTime();
  if (!then) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

/** True when there is meaningful data and no recent backup. */
export function needsBackupReminder(): boolean {
  if (typeof window === "undefined") return false;
  // Ignore the backup marker itself when deciding if there is data worth saving.
  const meaningful = getAllLocalStorageKeys().filter((key) => key !== LAST_BACKUP_KEY);
  if (meaningful.length < 3) return false;
  const days = daysSinceBackup();
  return days === null || days >= BACKUP_REMINDER_DAYS;
}

/** Format a byte count for display. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
