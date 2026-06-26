// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/verify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/verify")>();
  return { ...actual, verifyHash: vi.fn() };
});

import { verifyHash, type VerificationResult } from "@/lib/verify";
import { GET } from "@/app/api/verify/[hash]/route";
import { mockNextRequest, routeParams, BASE } from "./helpers";

const HASH = "a".repeat(64);
const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const found: VerificationResult = {
  verified: true,
  source: "single",
  hash: HASH,
  label: "thesis",
  owner: OWNER,
  stacksBlock: 1000,
  burnBlock: 900,
  contract: `${OWNER}.thesislock`,
  verifyUrl: `${BASE}/v/${HASH}`,
};

beforeEach(() => {
  vi.mocked(verifyHash).mockReset();
});

function call(hash: string, query = "") {
  return GET(mockNextRequest(`${BASE}/api/verify/${hash}${query}`), {
    params: routeParams({ hash }),
  });
}

describe("GET /api/verify/[hash]", () => {
  it("returns the verification result for a valid hash", async () => {
    vi.mocked(verifyHash).mockResolvedValue(found);
    const res = await call(HASH);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verified).toBe(true);
    expect(body.stacksBlock).toBe(1000);
  });

  it("rejects a hash that is not 64 hex characters", async () => {
    const res = await call("xyz");
    expect(res.status).toBe(400);
    expect((await res.json()).verified).toBe(false);
    expect(verifyHash).not.toHaveBeenCalled();
  });

  it("rejects an unsupported format", async () => {
    vi.mocked(verifyHash).mockResolvedValue(found);
    const res = await call(HASH, "?format=xml");
    expect(res.status).toBe(400);
  });

  it("reports verified false for a hash with no anchor", async () => {
    vi.mocked(verifyHash).mockResolvedValue({
      verified: false,
      hash: HASH,
      message: "Hash not found.",
    });
    const res = await call(HASH);
    expect((await res.json()).verified).toBe(false);
  });

  it("forwards the owner param to the lookup", async () => {
    vi.mocked(verifyHash).mockResolvedValue(found);
    await call(HASH, `?owner=${OWNER}`);
    expect(verifyHash).toHaveBeenCalledWith(HASH, OWNER, expect.any(String));
  });

  it("normalizes a 0x prefix and casing before validating", async () => {
    vi.mocked(verifyHash).mockResolvedValue(found);
    const res = await call(`0x${HASH.toUpperCase()}`);
    expect(res.status).toBe(200);
    expect(verifyHash).toHaveBeenCalledWith(HASH, undefined, expect.any(String));
  });

  it("sets CORS headers", async () => {
    vi.mocked(verifyHash).mockResolvedValue(found);
    const res = await call(HASH);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
