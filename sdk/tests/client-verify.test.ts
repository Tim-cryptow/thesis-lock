import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cl, serializeCV, type ClarityValue } from "@stacks/transactions";
import { createClient } from "../src/index";

const HASH =
  "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06";
const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

// A Hiro read-only response carries the result as a serialized Clarity value,
// so the mock builds the same encoding the contracts return.
function okResponse(cv: ClarityValue) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({ okay: true, result: `0x${serializeCV(cv)}` }),
  };
}

const singleAnchor = Cl.some(
  Cl.tuple({
    label: Cl.stringAscii("project"),
    "anchored-by": Cl.principal(OWNER),
    "stacks-block": Cl.uint(100),
    "burn-block": Cl.uint(90),
  }),
);
const batchAnchor = Cl.some(
  Cl.tuple({
    label: Cl.stringAscii("batch-doc"),
    "stacks-block": Cl.uint(200),
    "burn-block": Cl.uint(190),
    "batch-id": Cl.uint(3),
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

describe("verify", () => {
  it("returns a verified single result for an anchored hash", async () => {
    fetchMock.mockResolvedValue(okResponse(singleAnchor));
    const result = await createClient().verify(HASH);
    expect(result.verified).toBe(true);
    expect(result.source).toBe("single");
    expect(result.data).toEqual({
      hash: HASH,
      label: "project",
      anchoredBy: OWNER,
      stacksBlock: 100,
      burnBlock: 90,
    });
  });

  it("returns unverified for an unknown hash", async () => {
    fetchMock.mockResolvedValue(okResponse(Cl.none()));
    const result = await createClient().verify(HASH);
    expect(result.verified).toBe(false);
    expect(result.source).toBe(null);
    expect(result.data).toBe(null);
  });
});

describe("verifyBatch", () => {
  it("returns a verified batch result for an anchored hash and owner", async () => {
    fetchMock.mockResolvedValue(okResponse(batchAnchor));
    const result = await createClient().verifyBatch(HASH, OWNER);
    expect(result.verified).toBe(true);
    expect(result.source).toBe("batch");
    expect(result.data).toEqual({
      hash: HASH,
      owner: OWNER,
      label: "batch-doc",
      stacksBlock: 200,
      burnBlock: 190,
      batchId: 3,
    });
  });

  it("returns unverified when the owner has no batch anchor", async () => {
    fetchMock.mockResolvedValue(okResponse(Cl.none()));
    const result = await createClient().verifyBatch(HASH, OWNER);
    expect(result.verified).toBe(false);
    expect(result.data).toBe(null);
  });

  it("throws for an invalid owner principal", async () => {
    await expect(createClient().verifyBatch(HASH, "not-a-principal")).rejects.toThrow(
      /Invalid Stacks principal/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("verifyAny", () => {
  it("returns the single anchor without checking the batch contract", async () => {
    fetchMock.mockResolvedValue(okResponse(singleAnchor));
    const result = await createClient().verifyAny(HASH, OWNER);
    expect(result.source).toBe("single");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls through to the batch contract when no single anchor exists", async () => {
    fetchMock
      .mockResolvedValueOnce(okResponse(Cl.none()))
      .mockResolvedValueOnce(okResponse(batchAnchor));
    const result = await createClient().verifyAny(HASH, OWNER);
    expect(result.source).toBe("batch");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("checks only the single contract when no owner is given", async () => {
    fetchMock.mockResolvedValue(okResponse(Cl.none()));
    const result = await createClient().verifyAny(HASH);
    expect(result.verified).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("error handling", () => {
  it("throws a clear error on a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(createClient().verify(HASH)).rejects.toThrow("network down");
  });

  it("throws on a non-ok HTTP response", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
    });
    await expect(createClient().verify(HASH)).rejects.toThrow(
      /Hiro read-only call failed: 500/,
    );
  });
});
