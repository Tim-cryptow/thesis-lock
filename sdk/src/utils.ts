import { createHash } from "node:crypto";

const HEX_64 = /^[0-9a-f]{64}$/;

// Clarity serializes a (buff 32) as the type byte 0x02, a big-endian 4-byte
// length (0x00000020 = 32), then the raw bytes. This matches
// serializeCV(bufferCV(...)) from @stacks/transactions.
const BUFF_32_PREFIX = "0200000020";

function stripHex(hex: string): string {
  return hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
}

/** Lowercase 64-character hex digest of a string's UTF-8 bytes. */
export function hashString(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Lowercase 64-character hex SHA-256 digest of a file or buffer. */
export async function hashFile(file: File | Buffer): Promise<string> {
  const bytes = Buffer.isBuffer(file)
    ? file
    : Buffer.from(await file.arrayBuffer());
  return createHash("sha256").update(bytes).digest("hex");
}

/** True when the input is exactly 64 hex characters (an optional 0x is allowed). */
export function isValidHash(hash: string): boolean {
  return HEX_64.test(stripHex(hash).toLowerCase());
}

/**
 * Encodes a 64-character hex hash as a serialized Clarity (buff 32) value,
 * ready to pass as a contract-call argument. Returns hex without a 0x prefix.
 */
export function serializeHash(hex: string): string {
  const clean = stripHex(hex).toLowerCase();
  if (!HEX_64.test(clean)) {
    throw new Error("serializeHash expects a 64-character hex string");
  }
  return BUFF_32_PREFIX + clean;
}

/** Shortens a hash to its first and last `chars` characters for display. */
export function truncateHash(hash: string, chars = 8): string {
  const clean = stripHex(hash);
  if (clean.length <= chars * 2) return clean;
  return `${clean.slice(0, chars)}...${clean.slice(-chars)}`;
}
