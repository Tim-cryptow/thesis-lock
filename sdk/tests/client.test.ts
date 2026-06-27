import { describe, expect, it } from "vitest";
import { bufferCV, serializeCV } from "@stacks/transactions";
import { createClient, hashString, isValidHash, serializeHash, truncateHash } from "../src/index";

// A real single anchor on mainnet (label "project"). Used by the
// network-backed tests, which only run when SDK_INTEGRATION=1 so CI can skip
// them by default.
const KNOWN_HASH = "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06";
const UNANCHORED_HASH = "0000000000000000000000000000000000000000000000000000000000000001";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

describe("isValidHash", () => {
  it("accepts a 64-character lowercase hex string", () => {
    expect(isValidHash("a".repeat(64))).toBe(true);
    expect(isValidHash(KNOWN_HASH)).toBe(true);
  });

  it("accepts an optional 0x prefix and uppercase hex", () => {
    expect(isValidHash("0x" + "A".repeat(64))).toBe(true);
  });

  it("rejects wrong lengths and non-hex characters", () => {
    expect(isValidHash("")).toBe(false);
    expect(isValidHash("abc")).toBe(false);
    expect(isValidHash("z".repeat(64))).toBe(false);
    expect(isValidHash("a".repeat(63))).toBe(false);
    expect(isValidHash("a".repeat(65))).toBe(false);
  });
});

describe("hashString", () => {
  it("produces the known SHA-256 digest of an empty string", () => {
    expect(hashString("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("produces the known SHA-256 digest of 'hello'", () => {
    expect(hashString("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});

describe("serializeHash", () => {
  it("matches the @stacks/transactions Clarity buffer encoding", () => {
    const expected = serializeCV(bufferCV(hexToBytes(KNOWN_HASH)));
    expect(serializeHash(KNOWN_HASH)).toBe(expected);
  });

  it("prefixes with the (buff 32) type and length bytes", () => {
    expect(serializeHash(KNOWN_HASH)).toBe("0200000020" + KNOWN_HASH);
  });

  it("normalizes a 0x prefix and uppercase input", () => {
    expect(serializeHash("0x" + KNOWN_HASH.toUpperCase())).toBe("0200000020" + KNOWN_HASH);
  });

  it("throws on an invalid hash", () => {
    expect(() => serializeHash("nope")).toThrow();
  });
});

describe("truncateHash", () => {
  it("shortens a long hash and keeps short input intact", () => {
    expect(truncateHash(KNOWN_HASH, 4)).toBe("9afe...5d06");
    expect(truncateHash("abcd")).toBe("abcd");
  });
});

describe("client configuration", () => {
  it("defaults to the mainnet API URL", () => {
    expect(createClient().apiUrl).toBe("https://api.mainnet.hiro.so");
  });

  it("derives the testnet API URL from the network option", () => {
    const client = createClient({ network: "testnet" });
    expect(client.network).toBe("testnet");
    expect(client.apiUrl).toBe("https://api.testnet.hiro.so");
  });

  it("lets an explicit apiUrl override the network default", () => {
    const client = createClient({ network: "testnet", apiUrl: "https://example.test/" });
    expect(client.apiUrl).toBe("https://example.test");
  });
});

const runIntegration = process.env.SDK_INTEGRATION === "1";

describe.skipIf(!runIntegration)("ThesisLockClient (mainnet)", () => {
  it("verifies a known anchored hash", async () => {
    const client = createClient();
    const result = await client.verify(KNOWN_HASH);
    expect(result.verified).toBe(true);
    expect(result.source).toBe("single");
    expect(result.data?.hash).toBe(KNOWN_HASH);
  });

  it("returns unverified for a hash that was never anchored", async () => {
    const client = createClient();
    const result = await client.verify(UNANCHORED_HASH);
    expect(result.verified).toBe(false);
    expect(result.source).toBe(null);
    expect(result.data).toBe(null);
  });
});
