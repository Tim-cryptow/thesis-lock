import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GLOSSARY, getDefinition } from "../glossary";
import { installMemoryStorage } from "./memoryStorage";

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("getDefinition", () => {
  it("returns the definition for a known term", () => {
    expect(getDefinition("SHA-256 Hash")).toContain("fingerprint");
  });

  it("is case-insensitive", () => {
    expect(getDefinition("sha-256 hash")).toBe(getDefinition("SHA-256 Hash"));
  });

  it("trims surrounding whitespace", () => {
    expect(getDefinition("  Anchor  ")).toBe(getDefinition("Anchor"));
  });

  it("returns undefined for an unknown term", () => {
    expect(getDefinition("not a real term")).toBeUndefined();
  });

  it("resolves every glossary term", () => {
    for (const entry of GLOSSARY) {
      expect(getDefinition(entry.term)).toBe(entry.definition);
    }
  });
});

describe("GLOSSARY", () => {
  it("is a non-empty list", () => {
    expect(GLOSSARY.length).toBeGreaterThan(0);
  });

  it("has a non-empty term and definition for every entry", () => {
    for (const entry of GLOSSARY) {
      expect(entry.term.trim().length).toBeGreaterThan(0);
      expect(entry.definition.trim().length).toBeGreaterThan(0);
    }
  });

  it("has no duplicate terms", () => {
    const terms = GLOSSARY.map((e) => e.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
  });
});
