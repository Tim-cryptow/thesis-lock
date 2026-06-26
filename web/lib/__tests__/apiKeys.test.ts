import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateApiKey,
  maskKey,
  generateKeyId,
  loadKeys,
  saveKeys,
  deleteKey,
  type ApiKeyRecord,
} from "../apiKeys";
import { installMemoryStorage } from "./memoryStorage";

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
});

function record(over: Partial<ApiKeyRecord> = {}): ApiKeyRecord {
  return {
    id: "id-1",
    key: generateApiKey(),
    name: "CI",
    created: "2026-01-01T00:00:00.000Z",
    lastUsed: null,
    requestCount: 0,
    permissions: ["verify"],
    ...over,
  };
}

describe("generateApiKey", () => {
  it("produces a tl_ prefixed 32-hex-character secret", () => {
    expect(generateApiKey()).toMatch(/^tl_[0-9a-f]{32}$/);
  });

  it("has length 35", () => {
    expect(generateApiKey()).toHaveLength(35);
  });

  it("generates a distinct key each call", () => {
    expect(generateApiKey()).not.toBe(generateApiKey());
  });
});

describe("maskKey", () => {
  it("masks the middle of a full key", () => {
    const masked = maskKey("tl_0123456789abcdef0123456789abcdef");
    expect(masked).toBe("tl_012345...cdef");
  });

  it("passes through a short secret unchanged", () => {
    expect(maskKey("tl_abc")).toBe("tl_abc");
  });
});

describe("generateKeyId", () => {
  it("produces a 16-character hex id", () => {
    expect(generateKeyId()).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("loadKeys / saveKeys", () => {
  it("returns an empty list when nothing is stored", () => {
    expect(loadKeys()).toEqual([]);
  });

  it("round-trips a saved list", () => {
    const keys = [record({ id: "a" }), record({ id: "b" })];
    saveKeys(keys);
    expect(loadKeys().map((k) => k.id)).toEqual(["a", "b"]);
  });

  it("tolerates malformed stored data", () => {
    window.localStorage.setItem("thesislock_api_keys", '{"not":"an array"}');
    expect(loadKeys()).toEqual([]);
  });
});

describe("deleteKey", () => {
  it("removes a key by id and returns the new list", () => {
    saveKeys([record({ id: "a" }), record({ id: "b" })]);
    const next = deleteKey("a");
    expect(next.map((k) => k.id)).toEqual(["b"]);
    expect(loadKeys().map((k) => k.id)).toEqual(["b"]);
  });
});
