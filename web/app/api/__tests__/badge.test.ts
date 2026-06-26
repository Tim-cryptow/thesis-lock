// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/verify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/verify")>();
  return { ...actual, verifyHash: vi.fn() };
});

import { verifyHash, type VerificationResult } from "@/lib/verify";
import { GET } from "@/app/api/badge/[hash]/route";
import { mockNextRequest, routeParams, BASE } from "./helpers";

const HASH = "a".repeat(64);
const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const verified: VerificationResult = {
  verified: true,
  source: "single",
  hash: HASH,
  label: "thesis",
  owner: OWNER,
  stacksBlock: 1234,
  burnBlock: 1000,
  contract: `${OWNER}.thesislock`,
  verifyUrl: `${BASE}/v/${HASH}`,
};

beforeEach(() => {
  vi.mocked(verifyHash).mockReset();
});

function badge(hash: string) {
  return GET(mockNextRequest(`${BASE}/api/badge/${hash}`), {
    params: routeParams({ hash }),
  });
}

describe("GET /api/badge/[hash]", () => {
  it("returns an SVG content type", async () => {
    vi.mocked(verifyHash).mockResolvedValue(verified);
    const res = await badge(HASH);
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
  });

  it("renders an svg document", async () => {
    vi.mocked(verifyHash).mockResolvedValue(verified);
    const body = await (await badge(HASH)).text();
    expect(body.startsWith("<svg")).toBe(true);
  });

  it("shows Verified for an anchored hash", async () => {
    vi.mocked(verifyHash).mockResolvedValue(verified);
    const body = await (await badge(HASH)).text();
    expect(body).toContain("Verified");
  });

  it("shows Not Verified for an unanchored hash", async () => {
    vi.mocked(verifyHash).mockResolvedValue({
      verified: false,
      hash: HASH,
      message: "nope",
    });
    const body = await (await badge(HASH)).text();
    expect(body).toContain("Not Verified");
  });

  it("does not look up an invalid hash", async () => {
    const body = await (await badge("xyz")).text();
    expect(body).toContain("Not Verified");
    expect(verifyHash).not.toHaveBeenCalled();
  });

  it("caches the badge at the edge", async () => {
    vi.mocked(verifyHash).mockResolvedValue(verified);
    const res = await badge(HASH);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
  });
});
