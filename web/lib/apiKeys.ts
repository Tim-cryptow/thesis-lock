// Client-side API key management for the developer portal.
//
// These keys are a developer-experience aid only: they are generated and stored
// entirely in the browser's local storage and are not validated by any server.
// The public read API is unauthenticated. For production use behind a real
// gateway, validate keys server-side. The UX here mirrors a real developer
// portal so the integration flow is familiar.

const STORAGE_KEY = "thesislock_api_keys";

export type ApiKeyRecord = {
  id: string;
  key: string;
  name: string;
  // ISO timestamp the key was created.
  created: string;
  // ISO timestamp the key was last used, or null if never used.
  lastUsed: string | null;
  requestCount: number;
  permissions: string[];
};

// Permissions a key can be granted. These map to the public API surfaces a
// caller might integrate against.
export const AVAILABLE_PERMISSIONS = [
  "verify",
  "search",
  "stats",
  "badges",
  "profiles",
  "compare",
] as const;

export type Permission = (typeof AVAILABLE_PERMISSIONS)[number];

// Human-readable labels for each permission, used by the creation form and the
// key list badges.
export const PERMISSION_LABELS: Record<string, string> = {
  verify: "Verify",
  search: "Search",
  stats: "Stats",
  badges: "Badges",
  profiles: "Profiles",
  compare: "Compare",
};

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

// Generates a key of the form "tl_" followed by 32 random hex characters
// (16 bytes of cryptographically strong randomness).
export function generateApiKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `tl_${toHex(bytes)}`;
}

// Masks a key for display: keeps the "tl_" prefix, the first six characters of
// the secret, and the last four, hiding the middle.
export function maskKey(key: string): string {
  const body = key.startsWith("tl_") ? key.slice(3) : key;
  if (body.length <= 10) return `tl_${body}`;
  return `tl_${body.slice(0, 6)}...${body.slice(-4)}`;
}

// Generates a short opaque id for a key record, independent of the secret so it
// can appear in URLs and logs without exposing the key.
export function generateKeyId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

// localStorage is read defensively: it is unavailable during SSR and can throw
// in private-mode browsers, so every access is guarded.
export function loadKeys(): ApiKeyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ApiKeyRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveKeys(keys: ApiKeyRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Persistence is best-effort; callers keep the in-memory list.
  }
}

// Removes a key by id and persists the result. Returns the new list so callers
// can update state without a second read.
export function deleteKey(id: string): ApiKeyRecord[] {
  const next = loadKeys().filter((key) => key.id !== id);
  saveKeys(next);
  return next;
}
