// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/profile", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/profile")>();
  return { ...actual, fetchWalletProfile: vi.fn() };
});

import { fetchWalletProfile, type WalletProfile } from "@/lib/profile";
import { GET } from "@/app/api/profile/[address]/route";
import { mockNextRequest, routeParams, BASE } from "./helpers";

const ADDR = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const profile: WalletProfile = {
  address: ADDR,
  totalAnchors: 3,
  totalBatches: 1,
  groupsCreated: 0,
  proofNFTs: 0,
  firstSeen: 100,
  lastSeen: 200,
  recentAnchors: [],
  topLabels: [],
};

beforeEach(() => {
  vi.mocked(fetchWalletProfile).mockReset();
});

function profileReq(address: string) {
  return GET(mockNextRequest(`${BASE}/api/profile/${address}`), {
    params: routeParams({ address }),
  });
}

describe("GET /api/profile/[address]", () => {
  it("returns the profile JSON for a valid address", async () => {
    vi.mocked(fetchWalletProfile).mockResolvedValue(profile);
    const res = await profileReq(ADDR);
    expect(res.status).toBe(200);
    expect((await res.json()).address).toBe(ADDR);
  });

  it("rejects an invalid address", async () => {
    const res = await profileReq("not-an-address");
    expect(res.status).toBe(400);
    expect(fetchWalletProfile).not.toHaveBeenCalled();
  });

  it("includes the totalAnchors field", async () => {
    vi.mocked(fetchWalletProfile).mockResolvedValue(profile);
    const body = await (await profileReq(ADDR)).json();
    expect(typeof body.totalAnchors).toBe("number");
  });

  it("uppercases and echoes the requested address", async () => {
    vi.mocked(fetchWalletProfile).mockResolvedValue(profile);
    const body = await (await profileReq(ADDR.toLowerCase())).json();
    expect(body.address).toBe(ADDR);
  });

  it("returns 502 when the profile lookup fails", async () => {
    vi.mocked(fetchWalletProfile).mockRejectedValue(new Error("hiro down"));
    expect((await profileReq(ADDR)).status).toBe(502);
  });
});
