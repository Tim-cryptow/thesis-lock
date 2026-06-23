import { validateStacksAddress } from "@stacks/transactions";

export type ValidationResult = { valid: boolean; error?: string };

const HEX_64 = /^[0-9a-f]{64}$/;
// Printable ASCII only, matching the on-chain label constraint.
const ASCII = /^[\x20-\x7E]*$/;
const API_KEY_NAME = /^[A-Za-z0-9-]+$/;

const ok: ValidationResult = { valid: true };

// A document hash is a 64-character lowercase hex SHA-256 digest. A leading
// "0x" and surrounding whitespace are tolerated so pasted values still pass.
export function validateHash(input: string): ValidationResult {
  const value = input.trim().replace(/^0x/i, "").toLowerCase();
  if (value.length === 0) return { valid: false, error: "Enter a document hash." };
  if (!HEX_64.test(value)) {
    return { valid: false, error: "A hash is 64 hexadecimal characters." };
  }
  return ok;
}

// A Stacks address starts with SP or ST and passes the c32 checksum.
export function validateAddress(input: string): ValidationResult {
  const value = input.trim().toUpperCase();
  if (value.length === 0) return { valid: false, error: "Enter a Stacks address." };
  if (!/^S[PT]/.test(value)) {
    return { valid: false, error: "A Stacks address starts with SP or ST." };
  }
  if (!validateStacksAddress(value)) {
    return { valid: false, error: "Enter a valid Stacks address." };
  }
  return ok;
}

// Labels are optional, printable ASCII, and at most 64 characters.
export function validateLabel(input: string): ValidationResult {
  if (input.length > 64) {
    return { valid: false, error: "Label must be 64 characters or fewer." };
  }
  if (!ASCII.test(input)) {
    return { valid: false, error: "Labels must be ASCII only." };
  }
  return ok;
}

// Group names are required, printable ASCII, and at most 64 characters.
export function validateGroupName(input: string): ValidationResult {
  const value = input.trim();
  if (value.length === 0) return { valid: false, error: "Enter a group name." };
  if (value.length > 64) {
    return { valid: false, error: "Group name must be 64 characters or fewer." };
  }
  if (!ASCII.test(value)) {
    return { valid: false, error: "Group name must be ASCII only." };
  }
  return ok;
}

// A URL must parse and use http or https.
export function validateUrl(input: string): ValidationResult {
  const value = input.trim();
  if (value.length === 0) return { valid: false, error: "Enter a URL." };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { valid: false, error: "Enter a valid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, error: "URL must start with http:// or https://." };
  }
  return ok;
}

// API key names are required, letters/numbers/dashes only, at most 32 chars.
export function validateApiKeyName(input: string): ValidationResult {
  const value = input.trim();
  if (value.length === 0) return { valid: false, error: "Enter a name." };
  if (value.length > 32) {
    return { valid: false, error: "Name must be 32 characters or fewer." };
  }
  if (!API_KEY_NAME.test(value)) {
    return { valid: false, error: "Use letters, numbers, and dashes only." };
  }
  return ok;
}
