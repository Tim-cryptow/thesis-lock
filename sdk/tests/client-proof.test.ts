import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cl, serializeCV, type ClarityValue } from "@stacks/transactions";
import { createClient } from "../src/index";

const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const HASH =
  "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06";

function okResponse(cv: ClarityValue) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ okay: true, result: `0x${serializeCV(cv)}` }),
  };
}

const proof = Cl.some(
  Cl.tuple({
    hash: Cl.bufferFromHex(HASH),
    label: Cl.stringAscii("thesis"),
    "anchored-by": Cl.principal(OWNER),
    "stacks-block": Cl.uint(500),
    "burn-block": Cl.uint(490),
  }),
);

const proofRecord = (tokenId: number) => ({
  tokenId,
  hash: HASH,
  label: "thesis",
  anchoredBy: OWNER,
  stacksBlock: 500,
  burnBlock: 490,
});

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getProof", () => {
  it("returns a proof NFT for a valid token id", async () => {
    fetchMock.mockResolvedValue(okResponse(proof));
    expect(await createClient().getProof(1)).toEqual(proofRecord(1));
  });

  it("accepts token id 0", async () => {
    fetchMock.mockResolvedValue(okResponse(proof));
    expect(await createClient().getProof(0)).toEqual(proofRecord(0));
  });

  it("returns null for a non-existent token id", async () => {
    fetchMock.mockResolvedValue(okResponse(Cl.none()));
    expect(await createClient().getProof(99)).toBe(null);
  });

  it("throws for a negative token id", async () => {
    await expect(createClient().getProof(-1)).rejects.toThrow(/Invalid token id/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws for a non-integer token id", async () => {
    await expect(createClient().getProof(1.5)).rejects.toThrow(/Invalid token id/);
  });
});

describe("getProofByHash", () => {
  it("resolves a proof from its hash via a token-id lookup", async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse(Cl.some(Cl.uint(1))))
      .mockResolvedValueOnce(okResponse(proof));
    expect(await createClient().getProofByHash(HASH)).toEqual(proofRecord(1));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns null when no token maps to the hash", async () => {
    fetchMock.mockResolvedValue(okResponse(Cl.none()));
    expect(await createClient().getProofByHash(HASH)).toBe(null);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
