// sessionStorage handoff for the bulk verifier, mirroring reportLink. A page (a
// collection's "Verify All") stages per-item context here right before
// navigating to /verify-bulk so the verifier can pin each hash to the exact
// record it was collected from (an owner-keyed batch anchor, or a specific
// group row) instead of resolving a global single anchor for the same hash.

export const BULK_VERIFY_INPUT_KEY = "thesislock_bulk_verify_input";

export type BulkVerifyInput = {
  hash: string;
  name?: string;
  owner?: string;
  groupId?: number;
  groupIndex?: number;
  // The pinned same-site verify path, used verbatim for the row's Verify link
  // once the pinned record resolves on chain.
  verifyUrl?: string;
};

const HEX_64 = /^[0-9a-f]{64}$/;
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

function normalizeHash(raw: string): string {
  return raw.trim().toLowerCase().replace(/^0x/, "");
}

// The 64-hex hash of a same-site /v/<hash> path, or null when the value is not
// such a path. Mirrors collections.ts: requiring the leading "/v/" keeps a
// staged value from being an off-site or protocol-relative link.
function verifyPathHash(url: string): string | null {
  const m = /^\/v\/([0-9a-f]{64})(?:\?|$)/i.exec(url);
  return m ? m[1]!.toLowerCase() : null;
}

// Validates one staged item, dropping anything without a usable hash and any
// pinned context that does not match the item's hash, so a stale or tampered
// payload cannot pin a row to a different document than its hash.
function coerce(value: unknown): BulkVerifyInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.hash !== "string") return null;
  const hash = normalizeHash(v.hash);
  if (!HEX_64.test(hash)) return null;
  const out: BulkVerifyInput = { hash };
  if (typeof v.name === "string" && v.name) out.name = v.name;
  if (typeof v.owner === "string" && STX_PRINCIPAL.test(v.owner.toUpperCase())) {
    out.owner = v.owner.toUpperCase();
  }
  if (typeof v.groupId === "number" && Number.isInteger(v.groupId) && v.groupId >= 0) {
    out.groupId = v.groupId;
  }
  if (typeof v.groupIndex === "number" && Number.isInteger(v.groupIndex) && v.groupIndex >= 0) {
    out.groupIndex = v.groupIndex;
  }
  if (typeof v.verifyUrl === "string" && verifyPathHash(v.verifyUrl) === hash) {
    out.verifyUrl = v.verifyUrl;
  }
  return out;
}

export function stageBulkVerifyInput(items: BulkVerifyInput[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BULK_VERIFY_INPUT_KEY, JSON.stringify(items));
  } catch {
    // Best-effort; verify-bulk still loads, just without pinned context.
  }
}

// Reads and clears the staged input. Cleared on read so a later plain visit to
// /verify-bulk does not re-seed a previous collection's rows.
export function readBulkVerifyInput(): BulkVerifyInput[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(BULK_VERIFY_INPUT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(BULK_VERIFY_INPUT_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(coerce).filter((i): i is BulkVerifyInput => i !== null);
  } catch {
    return null;
  }
}
