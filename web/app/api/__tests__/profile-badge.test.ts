// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stacks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stacks")>();
  return { ...actual, getAnchorCount: vi.fn() };
});

import { getAnchorCount } from "@/lib/stacks";
import { GET } from "@/app/api/profile-badge/[address]/route";
import { mockNextRequest, routeParams, BASE } from "./helpers";

const ADDR = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

beforeEach(() => {
  vi.mocked(getAnchorCount).mockReset();
  vi.mocked(getAnchorCount).mockResolvedValue(5);
});

function badge(address: string) {
  return GET(mockNextRequest(`${BASE}/api/profile-badge/${address}`), {
    params: routeParams({ address }),
  });
}

describe("GET /api/profile-badge/[address]", () => {
  it("returns an SVG content type", async () => {
    const res = await badge(ADDR);
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
  });

  it("contains the truncated address", async () => {
    const body = await (await badge(ADDR)).text();
    expect(body).toContain(`${ADDR.slice(0, 5)}...${ADDR.slice(-4)}`);
  });

  it("includes the anchor count", async () => {
    const body = await (await badge(ADDR)).text();
    expect(body).toContain("5 anchors");
  });

  it("still returns an SVG for an invalid address without a lookup", async () => {
    const res = await badge("not-an-address");
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
    expect(getAnchorCount).not.toHaveBeenCalled();
  });
});
