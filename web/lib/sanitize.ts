// Pure, dependency-free input sanitizers shared by the client components and the
// API routes. These normalize and defang user-supplied text before it reaches a
// contract call, the Hiro API, a CSV export, or the DOM. They never throw: each
// returns a cleaned string (which may be empty when the input is unusable), so
// callers stay in control of validation and error messaging.

const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

/** Strip HTML tags and null bytes and trim surrounding whitespace. */
export function sanitizeInput(input: string): string {
  return input
    .replace(/\0/g, "")
    .replace(/<[^>]*>/g, "")
    .trim();
}

/**
 * Normalize a SHA-256 hash: drop whitespace and an optional 0x prefix, lowercase,
 * and keep only hex characters. Length validation is left to the caller.
 */
export function sanitizeHash(input: string): string {
  const compact = input.replace(/\s+/g, "").toLowerCase();
  const noPrefix = compact.startsWith("0x") ? compact.slice(2) : compact;
  return noPrefix.replace(/[^0-9a-f]/g, "");
}

/**
 * Normalize a Stacks principal: remove whitespace and uppercase it. Returns the
 * principal only when it has a valid SP/ST (or SM/SN) prefix and shape, otherwise
 * an empty string so callers can reject it.
 */
export function sanitizeAddress(input: string): string {
  const normalized = input.replace(/\s+/g, "").toUpperCase();
  return STX_PRINCIPAL.test(normalized) ? normalized : "";
}

/**
 * Normalize an anchor label to what the contract accepts: printable ASCII only,
 * trimmed, capped at the on-chain limit of 64 characters.
 */
export function sanitizeLabel(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .slice(0, 64);
}

/**
 * Escape a value for safe inclusion in a CSV cell. Guards against spreadsheet
 * formula injection (a leading =, +, -, @, or control character that Excel or
 * Google Sheets would execute) by prefixing a single quote, then applies normal
 * CSV quoting when the value contains a comma, quote, or newline.
 */
export function escapeForCSV(input: string): string {
  let value = input.replace(/\0/g, "");
  if (/^[=+\-@\t\r]/.test(value)) {
    value = `'${value}`;
  }
  if (/[",\r\n]/.test(value)) {
    value = `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
