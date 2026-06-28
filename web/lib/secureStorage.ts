// Safe wrappers around the Web Storage APIs. Every access is guarded so a server
// render, a privacy mode that throws on access, or an exhausted quota degrades
// to a no-op instead of crashing the calling component. The write helpers can
// optionally record a redacted entry in the local audit log, so security
// -relevant state changes (clearing data, toggling a setting) leave a trace
// without ever storing the value itself.
//
// Recursion safety: the audit log is itself persisted in localStorage. Auditing
// a write to an audit-internal key, or auditing from within an audit write,
// would re-enter this path and grow the log without bound. Both are blocked:
// audit-internal keys are never audited, and a reentrancy flag suppresses any
// nested audit write.

import { logAudit } from "./audit";

type StorageKind = "local" | "session";

// Prefix of the keys owned by the audit subsystem (thesislock_audit_log,
// _integrity, _session, _enabled, _retention). Writes to any of these are never
// themselves audited, which is what keeps audit logging from recursing.
const AUDIT_INTERNAL_PREFIX = "thesislock_audit";

function backend(kind: StorageKind): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

// Guards against re-entering the audit path while an audit entry is being
// written. logAudit persists through window.localStorage directly rather than
// through these wrappers, so this is defense in depth rather than the primary
// guard, but it keeps the invariant explicit and cheap.
let auditing = false;

function recordAudit(action: string, key: string): void {
  if (auditing || key.startsWith(AUDIT_INTERNAL_PREFIX)) return;
  auditing = true;
  try {
    logAudit({ action, category: "system", actor: null, target: key, metadata: {}, ipHash: null });
  } catch {
    // Audit logging is best-effort and must never block the storage operation.
  } finally {
    auditing = false;
  }
}

export type WriteOptions = { audit?: boolean };

/** Read a string, returning null when storage is unavailable or the key is unset. */
export function safeGet(key: string, kind: StorageKind = "local"): string | null {
  const store = backend(kind);
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

/** Write a string, returning whether it persisted. Optionally records an audit entry. */
export function safeSet(
  key: string,
  value: string,
  kind: StorageKind = "local",
  options: WriteOptions = {},
): boolean {
  const store = backend(kind);
  if (!store) return false;
  try {
    store.setItem(key, value);
  } catch {
    return false;
  }
  if (options.audit) {
    recordAudit("storage_write", key);
  }
  return true;
}

/** Remove a key, returning whether the call succeeded. Optionally records an audit entry. */
export function safeRemove(
  key: string,
  kind: StorageKind = "local",
  options: WriteOptions = {},
): boolean {
  const store = backend(kind);
  if (!store) return false;
  try {
    store.removeItem(key);
  } catch {
    return false;
  }
  if (options.audit) {
    recordAudit("storage_remove", key);
  }
  return true;
}

/** Parse a stored JSON value, returning the fallback on absence or corruption. */
export function getJSON<T>(key: string, fallback: T, kind: StorageKind = "local"): T {
  const raw = safeGet(key, kind);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Serialize and store a value as JSON. Returns whether it persisted. */
export function setJSON(
  key: string,
  value: unknown,
  kind: StorageKind = "local",
  options: WriteOptions = {},
): boolean {
  try {
    return safeSet(key, JSON.stringify(value), kind, options);
  } catch {
    return false;
  }
}
