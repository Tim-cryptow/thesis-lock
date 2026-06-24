// Helpers for reading the decoded Clarity values Hiro delivers when a chainhook
// predicate sets decode_clarity_values: true. The decoded shapes vary across
// Hiro and Stacks versions: a tuple may be a flat object or wrapped in { value },
// and a uint may arrive as a number, a numeric string, or a "u123" string. Parse
// defensively and keep the raw tuple for forward-compatibility.

export type DecodedAnchor = {
  event: string;
  hash: string | null;
  anchoredBy: string | null;
  stacksBlock: number | null;
  burnBlock: number | null;
  label: string | null;
  raw: unknown;
};

// Unwrap a { value } wrapper if present (matching the variants handled in
// hiroAnchor.ts); otherwise return the input as-is.
function unwrap(input: unknown): unknown {
  if (input && typeof input === "object" && "value" in input) {
    return (input as { value: unknown }).value;
  }
  return input;
}

function tupleFields(input: unknown): Record<string, unknown> {
  const value = unwrap(input);
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return {};
}

export function toStr(input: unknown): string | null {
  const value = unwrap(input);
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return null;
}

// A buff arrives as a hex string; normalize to a lowercase 0x-prefixed form.
export function toHex(input: unknown): string | null {
  const value = toStr(input);
  if (value == null) return null;
  const lower = value.toLowerCase();
  return lower.startsWith("0x") ? lower : `0x${lower}`;
}

// Accept number, numeric string, or Clarity "u123" string. Block heights are far
// below 2^53 and bigint is not JSON-serializable, so a number is the right type.
export function toUint(input: unknown): number | null {
  const value = unwrap(input);
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const digits = value.trim().replace(/^u/, "");
    if (/^\d+$/.test(digits)) {
      const parsed = Number(digits);
      return Number.isFinite(parsed) ? parsed : null;
    }
  }
  return null;
}

// Decode the print tuple emitted by anchor-document. Returns null when the value
// is not a recognizable event envelope.
export function decodeAnchorTuple(value: unknown): DecodedAnchor | null {
  const fields = tupleFields(value);
  const event = toStr(fields["event"]);
  if (event == null) return null;
  return {
    event,
    hash: toHex(fields["hash"]),
    anchoredBy: toStr(fields["anchored-by"]),
    stacksBlock: toUint(fields["stacks-block"]),
    burnBlock: toUint(fields["burn-block"]),
    label: toStr(fields["label"]),
    raw: value,
  };
}
