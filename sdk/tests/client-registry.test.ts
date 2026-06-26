import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cl, serializeCV, type ClarityValue } from "@stacks/transactions";
import { createClient } from "../src/index";

const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const HASH1 = "a".repeat(64);
const HASH2 = "b".repeat(64);

function okResponse(cv: ClarityValue) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ okay: true, result: `0x${serializeCV(cv)}` }),
  };
}

const entry = (hash: string, label: string, anchoredAt: number) =>
  Cl.some(
    Cl.tuple({
      hash: Cl.bufferFromHex(hash),
      label: Cl.stringAscii(label),
      "anchored-at": Cl.uint(anchoredAt),
    }),
  );

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getAnchorCount", () => {
  it("returns the registered anchor count", async () => {
    fetchMock.mockResolvedValue(okResponse(Cl.uint(5)));
    expect(await createClient().getAnchorCount(OWNER)).toBe(5);
  });

  it("returns 0 for an address with no anchors", async () => {
    fetchMock.mockResolvedValue(okResponse(Cl.uint(0)));
    expect(await createClient().getAnchorCount(OWNER)).toBe(0);
  });

  it("throws for an invalid owner principal", async () => {
    await expect(createClient().getAnchorCount("nope")).rejects.toThrow(
      /Invalid Stacks principal/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getRecentAnchors", () => {
  it("returns an array of registry entries with the correct fields", async () => {
    fetchMock.mockResolvedValue(
      okResponse(Cl.list([entry(HASH1, "doc-1", 100), entry(HASH2, "doc-2", 99)])),
    );
    const entries = await createClient().getRecentAnchors(OWNER);
    expect(entries).toEqual([
      { hash: HASH1, label: "doc-1", anchoredAt: 100 },
      { hash: HASH2, label: "doc-2", anchoredAt: 99 },
    ]);
  });

  it("filters out the empty slots in the recent window", async () => {
    fetchMock.mockResolvedValue(
      okResponse(
        Cl.list([entry(HASH1, "doc-1", 100), Cl.none(), entry(HASH2, "doc-2", 99)]),
      ),
    );
    const entries = await createClient().getRecentAnchors(OWNER);
    expect(entries.map((e) => e.hash)).toEqual([HASH1, HASH2]);
  });

  it("returns a single-entry list", async () => {
    fetchMock.mockResolvedValue(okResponse(Cl.list([entry(HASH1, "only", 1)])));
    expect(await createClient().getRecentAnchors(OWNER)).toEqual([
      { hash: HASH1, label: "only", anchoredAt: 1 },
    ]);
  });

  it("returns an empty array when there are no anchors", async () => {
    fetchMock.mockResolvedValue(okResponse(Cl.list([Cl.none(), Cl.none()])));
    expect(await createClient().getRecentAnchors(OWNER)).toEqual([]);
  });

  it("throws for an invalid owner principal", async () => {
    await expect(createClient().getRecentAnchors("nope")).rejects.toThrow(
      /Invalid Stacks principal/,
    );
  });
});
