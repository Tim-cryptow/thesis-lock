import { describe, expect, it } from "vitest";
import {
  escapeForCSV,
  sanitizeAddress,
  sanitizeHash,
  sanitizeInput,
  sanitizeLabel,
} from "../sanitize";

const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

describe("sanitizeInput", () => {
  it("strips HTML tags", () => {
    expect(sanitizeInput("<script>alert(1)</script>x")).toBe("alert(1)x");
    expect(sanitizeInput("<b>bold</b>")).toBe("bold");
  });

  it("removes null bytes and trims", () => {
    expect(sanitizeInput("  a\0b  ")).toBe("ab");
  });
});

describe("sanitizeHash", () => {
  it("lowercases, strips 0x, and removes whitespace", () => {
    expect(sanitizeHash("0xABCDEF")).toBe("abcdef");
    expect(sanitizeHash("  0x AB CD  ")).toBe("abcd");
  });

  it("keeps only hex characters", () => {
    expect(sanitizeHash("xyz123")).toBe("123");
  });
});

describe("sanitizeAddress", () => {
  it("normalizes and accepts a valid principal", () => {
    expect(sanitizeAddress(`  ${OWNER.toLowerCase()}  `)).toBe(OWNER);
  });

  it("returns empty string for a non-principal", () => {
    expect(sanitizeAddress("hello")).toBe("");
    expect(sanitizeAddress("")).toBe("");
  });
});

describe("sanitizeLabel", () => {
  it("strips non-ASCII and control characters", () => {
    expect(sanitizeLabel("café\nmenu")).toBe("cafmenu");
  });

  it("trims and caps at 64 characters", () => {
    expect(sanitizeLabel(`  ${"a".repeat(100)}  `)).toBe("a".repeat(64));
  });
});

describe("escapeForCSV", () => {
  it("neutralizes formula injection", () => {
    expect(escapeForCSV("=cmd()")).toBe("'=cmd()");
    expect(escapeForCSV("+1")).toBe("'+1");
    expect(escapeForCSV("-5")).toBe("'-5");
    expect(escapeForCSV("@ref")).toBe("'@ref");
  });

  it("quotes values containing commas, quotes, or newlines", () => {
    expect(escapeForCSV("a,b")).toBe('"a,b"');
    expect(escapeForCSV('he said "hi"')).toBe('"he said ""hi"""');
    expect(escapeForCSV("line1\nline2")).toBe('"line1\nline2"');
  });

  it("leaves plain values unchanged", () => {
    expect(escapeForCSV("normal text")).toBe("normal text");
  });
});
