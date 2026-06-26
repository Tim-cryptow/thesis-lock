import { describe, expect, it } from "vitest";
import {
  hashString,
  isValidHash,
  serializeHash,
  truncateHash,
} from "../src/index";

const KNOWN_HASH =
  "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06";

describe("isValidHash", () => {
  it("accepts a 64-character lowercase hex string", () => {
    expect(isValidHash("a".repeat(64))).toBe(true);
    expect(isValidHash(KNOWN_HASH)).toBe(true);
  });

  it("accepts an optional 0x prefix", () => {
    expect(isValidHash(`0x${KNOWN_HASH}`)).toBe(true);
  });

  it("accepts uppercase hex", () => {
    expect(isValidHash("A".repeat(64))).toBe(true);
  });

  it("rejects a string that is too short", () => {
    expect(isValidHash("a".repeat(63))).toBe(false);
  });

  it("rejects a string that is too long", () => {
    expect(isValidHash("a".repeat(65))).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isValidHash("z".repeat(64))).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidHash("")).toBe(false);
  });
});

describe("hashString", () => {
  it("produces the known SHA-256 digest of an empty string", () => {
    expect(hashString("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("produces the known SHA-256 digest of 'hello'", () => {
    expect(hashString("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("is deterministic for the same input", () => {
    expect(hashString("thesis-chapter-3")).toBe(hashString("thesis-chapter-3"));
  });

  it("produces different digests for different inputs", () => {
    expect(hashString("a")).not.toBe(hashString("b"));
  });
});

describe("serializeHash", () => {
  it("prefixes the (buff 32) type and length bytes", () => {
    expect(serializeHash(KNOWN_HASH)).toBe(`0200000020${KNOWN_HASH}`);
  });

  it("normalizes a 0x prefix and uppercase input", () => {
    expect(serializeHash(`0x${KNOWN_HASH.toUpperCase()}`)).toBe(
      `0200000020${KNOWN_HASH}`,
    );
  });

  it("throws on a non-hex value", () => {
    expect(() => serializeHash("nope")).toThrow();
  });

  it("throws on a hash that is not 64 characters", () => {
    expect(() => serializeHash("a".repeat(63))).toThrow();
  });
});

describe("truncateHash", () => {
  it("keeps the first and last 8 characters by default", () => {
    expect(truncateHash(KNOWN_HASH)).toBe("9afe6f57...28585d06");
  });

  it("respects a custom character count", () => {
    expect(truncateHash(KNOWN_HASH, 4)).toBe("9afe...5d06");
  });

  it("strips a 0x prefix before truncating", () => {
    expect(truncateHash(`0x${KNOWN_HASH}`, 4)).toBe("9afe...5d06");
  });

  it("returns a short hash unchanged", () => {
    expect(truncateHash("abcd")).toBe("abcd");
  });
});
