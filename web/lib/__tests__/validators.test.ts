import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  validateHash,
  validateAddress,
  validateLabel,
  validateUrl,
  validateGroupName,
  validateApiKeyName,
} from "../validators";
import { installMemoryStorage } from "./memoryStorage";

// Real, checksum-valid Stacks addresses. validateAddress runs a c32 checksum
// (validateStacksAddress), so these must be genuine principals.
const VALID_SP = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const VALID_ST = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
// Same prefix and length as VALID_SP but the final character is altered, which
// breaks the c32 checksum.
const BAD_CHECKSUM_SP = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVZ";

const HASH_64 = "a".repeat(64);

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("validateHash", () => {
  it("accepts a 64-character lowercase hex digest", () => {
    expect(validateHash(HASH_64)).toEqual({ valid: true });
  });

  it("accepts an uppercase digest by lowercasing it", () => {
    expect(validateHash("A".repeat(64)).valid).toBe(true);
  });

  it("tolerates a leading 0x prefix and surrounding whitespace", () => {
    expect(validateHash(`  0x${HASH_64}  `).valid).toBe(true);
  });

  it("rejects a digest that is too short", () => {
    const result = validateHash("a".repeat(63));
    expect(result.valid).toBe(false);
    expect(result.error).toBe("A hash is 64 hexadecimal characters.");
  });

  it("rejects a digest that is too long", () => {
    expect(validateHash("a".repeat(65)).valid).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(validateHash("g".repeat(64)).valid).toBe(false);
  });

  it("rejects an empty value with a prompt to enter a hash", () => {
    expect(validateHash("   ")).toEqual({
      valid: false,
      error: "Enter a document hash.",
    });
  });
});

describe("validateAddress", () => {
  it("accepts a valid mainnet SP address", () => {
    expect(validateAddress(VALID_SP).valid).toBe(true);
  });

  it("accepts a valid testnet ST address", () => {
    expect(validateAddress(VALID_ST).valid).toBe(true);
  });

  it("accepts a lowercased address by uppercasing it", () => {
    expect(validateAddress(VALID_SP.toLowerCase()).valid).toBe(true);
  });

  it("rejects an address with the wrong prefix", () => {
    const result = validateAddress("not-an-address");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("A Stacks address starts with SP or ST.");
  });

  it("rejects a well-formed prefix with a bad checksum", () => {
    const result = validateAddress(BAD_CHECKSUM_SP);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Enter a valid Stacks address.");
  });

  it("rejects an empty value", () => {
    expect(validateAddress("")).toEqual({
      valid: false,
      error: "Enter a Stacks address.",
    });
  });
});

describe("validateLabel", () => {
  it("accepts printable ASCII", () => {
    expect(validateLabel("thesis-chapter-3").valid).toBe(true);
  });

  it("accepts an empty label (labels are optional)", () => {
    expect(validateLabel("").valid).toBe(true);
  });

  it("accepts a label of exactly 64 characters", () => {
    expect(validateLabel("x".repeat(64)).valid).toBe(true);
  });

  it("rejects a label longer than 64 characters", () => {
    const result = validateLabel("x".repeat(65));
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Label must be 64 characters or fewer.");
  });

  it("rejects non-ASCII characters", () => {
    const result = validateLabel("café");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Labels must be ASCII only.");
  });
});

describe("validateUrl", () => {
  it("accepts an http URL", () => {
    expect(validateUrl("http://example.com").valid).toBe(true);
  });

  it("accepts an https URL", () => {
    expect(validateUrl("https://example.com/path?q=1").valid).toBe(true);
  });

  it("rejects a non-http(s) protocol", () => {
    const result = validateUrl("ftp://example.com");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("URL must start with http:// or https://.");
  });

  it("rejects an unparseable value", () => {
    const result = validateUrl("not a url");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Enter a valid URL.");
  });

  it("rejects an empty value", () => {
    expect(validateUrl("  ").valid).toBe(false);
  });
});

describe("validateGroupName", () => {
  it("accepts a normal name", () => {
    expect(validateGroupName("Research Team").valid).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(validateGroupName("   ")).toEqual({
      valid: false,
      error: "Enter a group name.",
    });
  });

  it("rejects a name longer than 64 characters", () => {
    expect(validateGroupName("g".repeat(65)).valid).toBe(false);
  });

  it("rejects non-ASCII characters", () => {
    expect(validateGroupName("gröup").valid).toBe(false);
  });
});

describe("validateApiKeyName", () => {
  it("accepts letters, numbers, and dashes", () => {
    expect(validateApiKeyName("ci-key-2").valid).toBe(true);
  });

  it("rejects an empty value", () => {
    expect(validateApiKeyName("").valid).toBe(false);
  });

  it("rejects a name longer than 32 characters", () => {
    expect(validateApiKeyName("k".repeat(33)).valid).toBe(false);
  });

  it("rejects spaces and punctuation", () => {
    const result = validateApiKeyName("my key!");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Use letters, numbers, and dashes only.");
  });
});
