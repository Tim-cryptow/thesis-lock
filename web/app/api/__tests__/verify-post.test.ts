// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/verify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/verify")>();
  return { ...actual, verifyHash: vi.fn() };
});

import { verifyHash, type VerificationResult } from "@/lib/verify";
import { POST } from "@/app/api/verify/route";
import { createMockRequest, BASE } from "./helpers";

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

describe("POST /api/verify", () => {
  it("verifies a hash from a JSON body", async () => {
    vi.mocked(verifyHash).mockResolvedValue(found);
    const res = await POST(
      createMockRequest("POST", `${BASE}/api/verify`, { hash: HASH }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).verified).toBe(true);
    expect(verifyHash).toHaveBeenCalledWith(HASH, undefined, expect.any(String));
  });

  it("rejects a missing hash", async () => {
    const res = await POST(
      createMockRequest("POST", `${BASE}/api/verify`, {}),
    );
    expect(res.status).toBe(400);
    expect(verifyHash).not.toHaveBeenCalled();
  });

  it("rejects an invalid hash", async () => {
    const res = await POST(
      createMockRequest("POST", `${BASE}/api/verify`, { hash: "xyz" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an invalid JSON body", async () => {
    const req = new Request(`${BASE}/api/verify`, {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns the verification result, matching the GET route shape", async () => {
    vi.mocked(verifyHash).mockResolvedValue(found);
    const res = await POST(
      createMockRequest("POST", `${BASE}/api/verify`, { hash: HASH }),
    );
    expect(await res.json()).toMatchObject({
      verified: true,
      hash: HASH,
      stacksBlock: 1000,
    });
  });
});
