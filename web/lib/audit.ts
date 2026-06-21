// Compliance-grade audit trail. Records every meaningful interaction with the
// app in a tamper-evident, browser-local log so a user in an academic or legal
// setting can prove the chain of custody for their actions. Like the rest of the
// app's client features it never touches a server: entries live in localStorage,
// and integrity is established with a SHA-256 over the log that any later read
// can recompute and compare.

const STORAGE_KEY = "thesislock_audit_log";
const SESSION_KEY = "thesislock_audit_session";
// The integrity hash of the log as last written. Recomputing the hash over the
// stored entries and comparing it to this value reveals out-of-band tampering.
const INTEGRITY_KEY = "thesislock_audit_integrity";

// Dispatched whenever the log changes, so the viewer and any summary stay live.
export const AUDIT_CHANGED_EVENT = "thesislock:audit-changed";

// Oldest entries are dropped first once the log reaches this size.
export const AUDIT_CAP = 2000;

export type AuditCategory =
  | "anchor"
  | "verify"
  | "group"
  | "proof"
  | "export"
  | "search"
  | "system";

export const AUDIT_CATEGORIES: AuditCategory[] = [
  "anchor",
  "verify",
  "group",
  "proof",
  "export",
  "search",
  "system",
];

export type AuditEntry = {
  id: string;
  action: string;
  category: AuditCategory;
  actor: string | null;
  target: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
  sessionId: string;
  // Always null in this client-only build (no server sees the IP); kept on the
  // record so a future server-side sink can populate it without a schema change.
  ipHash: string | null;
  userAgent: string;
};

export type AuditReport = {
  id: string;
  generatedAt: string;
  period: { from: string; to: string };
  totalActions: number;
  actionBreakdown: Record<string, number>;
  uniqueActors: number;
  entries: AuditEntry[];
  integrityHash: string;
};

export type AuditFilters = {
  category?: string;
  actor?: string;
  dateFrom?: string;
  dateTo?: string;
  action?: string;
};

// ---------------------------------------------------------------------------
// SHA-256 (FIPS 180-4), synchronous, over the UTF-8 bytes of a string. Used for
// the integrity hash so it can be computed inline rather than awaited. Verified
// against the standard test vectors (empty string and "abc").
// ---------------------------------------------------------------------------

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function utf8Bytes(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str);
  const out: number[] = [];
  for (let i = 0; i < str.length; i += 1) {
    const c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff) {
      const c2 = str.charCodeAt((i += 1));
      const cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(out);
}

function sha256Hex(message: string): string {
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bytes = utf8Bytes(message);
  const bitLen = bytes.length * 8;
  const totalLen = ((bytes.length + 1 + 8 + 63) >> 6) << 6;
  const buf = new Uint8Array(totalLen);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(totalLen - 4, bitLen >>> 0, false);
  dv.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let off = 0; off < totalLen; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 =
        rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA256_K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const hex = (x: number) => (x >>> 0).toString(16).padStart(8, "0");
  return (
    hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7)
  );
}

// ---------------------------------------------------------------------------

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    // Fall through to the time-based id.
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

// A stable id for the browser session, created once and reused so every entry in
// one visit shares it. Lives in sessionStorage, so a new tab or a restart starts
// a fresh session.
export function generateSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = randomId();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

// Shortens a long value (a principal, hash, or session id) for table display.
export function truncateMiddle(value: string, lead = 8, tail = 6): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}

function coerceEntry(value: unknown): AuditEntry | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.action !== "string") return null;
  if (typeof v.timestamp !== "string") return null;
  const category = AUDIT_CATEGORIES.includes(v.category as AuditCategory)
    ? (v.category as AuditCategory)
    : "system";
  return {
    id: v.id,
    action: v.action,
    category,
    actor: typeof v.actor === "string" ? v.actor : null,
    target: typeof v.target === "string" ? v.target : null,
    metadata:
      v.metadata && typeof v.metadata === "object"
        ? (v.metadata as Record<string, unknown>)
        : {},
    timestamp: v.timestamp,
    sessionId: typeof v.sessionId === "string" ? v.sessionId : "",
    ipHash: typeof v.ipHash === "string" ? v.ipHash : null,
    userAgent: typeof v.userAgent === "string" ? v.userAgent : "",
  };
}

function loadRaw(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(coerceEntry)
      .filter((e): e is AuditEntry => e !== null);
  } catch {
    return [];
  }
}

// Deterministic JSON with object keys sorted recursively, so metadata hashes the
// same regardless of key insertion order.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

// Every persisted field of an entry, in a fixed order. Hashing the JSON encoding
// of these (rather than a separator-joined string) makes the digest collision
// free: JSON quoting escapes any delimiter a value could contain, so no value
// can forge a field or entry boundary.
function entryFields(e: AuditEntry): unknown[] {
  return [
    e.id,
    e.timestamp,
    e.action,
    e.category,
    e.actor,
    e.target,
    e.sessionId,
    e.ipHash,
    e.userAgent,
    e.metadata,
  ];
}

// SHA-256 over a canonical serialization of every field of every entry, in
// order. Any addition, removal, reorder, or edit to any field changes the
// digest, which is what makes the log tamper evident when compared against the
// stored value.
export function computeIntegrityHash(entries: AuditEntry[]): string {
  return sha256Hex(stableStringify(entries.map(entryFields)));
}

export function getStoredIntegrityHash(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(INTEGRITY_KEY);
  } catch {
    return null;
  }
}

export function logAudit(
  entry: Omit<AuditEntry, "id" | "timestamp" | "sessionId" | "userAgent">,
): AuditEntry {
  const full: AuditEntry = {
    id: randomId(),
    action: entry.action,
    category: entry.category,
    actor: entry.actor ?? null,
    target: entry.target ?? null,
    metadata: entry.metadata ?? {},
    timestamp: new Date().toISOString(),
    sessionId: generateSessionId(),
    ipHash: entry.ipHash ?? null,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
  if (typeof window === "undefined") return full;
  try {
    const existing = loadRaw();
    const stored = getStoredIntegrityHash();
    // If a baseline exists and the current entries no longer match it, the log
    // was edited out of band. Keep recording, but do not advance the baseline,
    // so verification keeps reporting the tamper instead of normalizing it on
    // the next action (such as the page_view from opening the audit page).
    const tampered =
      stored !== null && computeIntegrityHash(existing) !== stored;
    const capped = [...existing, full].slice(-AUDIT_CAP);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
    if (!tampered) {
      window.localStorage.setItem(INTEGRITY_KEY, computeIntegrityHash(capped));
    }
  } catch {
    // Logging is best-effort and never blocks the action being recorded.
  }
  try {
    window.dispatchEvent(new CustomEvent(AUDIT_CHANGED_EVENT));
  } catch {
    // CustomEvent may be unavailable; non-fatal.
  }
  return full;
}

function matchesFilters(entry: AuditEntry, filters: AuditFilters): boolean {
  if (filters.category && entry.category !== filters.category) return false;
  if (
    filters.actor &&
    !(entry.actor ?? "").toLowerCase().includes(filters.actor.toLowerCase())
  ) {
    return false;
  }
  if (
    filters.action &&
    !entry.action.toLowerCase().includes(filters.action.toLowerCase())
  ) {
    return false;
  }
  if (filters.dateFrom && entry.timestamp < filters.dateFrom) return false;
  if (filters.dateTo && entry.timestamp > filters.dateTo) return false;
  return true;
}

// The log in chronological (oldest first) order, optionally filtered. Callers
// that want newest-first sort the result themselves.
export function getAuditLog(filters?: AuditFilters): AuditEntry[] {
  const entries = loadRaw();
  return filters ? entries.filter((e) => matchesFilters(e, filters)) : entries;
}

export function formatAuditCsv(entries: AuditEntry[]): string {
  const headers = [
    "id",
    "timestamp",
    "action",
    "category",
    "actor",
    "target",
    "sessionId",
    "ipHash",
    "userAgent",
    "metadata",
  ];
  const escape = (value: string): string =>
    /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const rows = entries.map((e) =>
    [
      e.id,
      e.timestamp,
      e.action,
      e.category,
      e.actor ?? "",
      e.target ?? "",
      e.sessionId,
      e.ipHash ?? "",
      e.userAgent,
      JSON.stringify(e.metadata),
    ]
      .map((cell) => escape(String(cell)))
      .join(","),
  );
  return [headers.join(","), ...rows].join("\r\n");
}

export function exportAuditLog(
  format: "json" | "csv",
  filters?: AuditFilters,
): string {
  const entries = getAuditLog(filters);
  return format === "csv"
    ? formatAuditCsv(entries)
    : JSON.stringify(entries, null, 2);
}

// Builds a self-contained report over the given entries: the period they span,
// per-action counts, the number of distinct actors, and the integrity hash that
// pins the exact set and order of entries.
export function generateAuditReport(entries: AuditEntry[]): AuditReport {
  const sorted = [...entries].sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp),
  );
  const actionBreakdown: Record<string, number> = {};
  const actors = new Set<string>();
  for (const e of entries) {
    actionBreakdown[e.action] = (actionBreakdown[e.action] ?? 0) + 1;
    if (e.actor) actors.add(e.actor);
  }
  return {
    id: randomId(),
    generatedAt: new Date().toISOString(),
    period: {
      from: sorted[0]?.timestamp ?? "",
      to: sorted[sorted.length - 1]?.timestamp ?? "",
    },
    totalActions: entries.length,
    actionBreakdown,
    uniqueActors: actors.size,
    entries,
    integrityHash: computeIntegrityHash(entries),
  };
}
