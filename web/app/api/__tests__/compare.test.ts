// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/compare", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/compare")>();
  return { ...actual, compareAnchors: vi.fn() };
});

import { compareAnchors, type AnchorComparison } from "@/lib/compare";
import { GET } from "@/app/api/compare/route";
import { mockNextRequest, BASE } from "./helpers";

const A = "a".repeat(64);
const B = "b".repeat(64);
const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const comparison: AnchorComparison = {
  left: { hash: A, label: "v1", owner: OWNER, block: 100, burnBlock: 90, source: "single", proofNFT: null },
  right: { hash: B, label: "v2", owner: OWNER, block: 200, burnBlock: 95, source: "single", proofNFT: null },
  timeDelta: { blocks: 100, estimatedMinutes: 50 },
  sameOwner: true,
  sameLabel: false,
  sameSource: true,
  sameTemplate: false,
  olderSide: "left",
  supersedes: null,
};

beforeEach(() => {
  vi.mocked(compareAnchors).mockReset();
});

function compareReq(query: string) {
  return GET(mockNextRequest(`${BASE}/api/compare${query}`));
}

describe("GET /api/compare", () => {
  it("returns the comparison for two valid hashes", async () => {
    vi.mocked(compareAnchors).mockResolvedValue(comparison);
    const res = await compareReq(`?a=${A}&b=${B}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.left.hash).toBe(A);
    expect(body.right.hash).toBe(B);
  });

  it("returns 400 when a is missing", async () => {
    const res = await compareReq(`?b=${B}`);
    expect(res.status).toBe(400);
    expect(compareAnchors).not.toHaveBeenCalled();
  });

  it("returns 400 when b is missing", async () => {
    expect((await compareReq(`?a=${A}`)).status).toBe(400);
  });

  it("includes left and right entries and a timeDelta", async () => {
    vi.mocked(compareAnchors).mockResolvedValue(comparison);
    const body = await (await compareReq(`?a=${A}&b=${B}`)).json();
    expect(body.left).toBeTypeOf("object");
    expect(body.right).toBeTypeOf("object");
    expect(body.timeDelta).toMatchObject({ blocks: expect.any(Number) });
  });

  it("returns 502 when the comparison fails", async () => {
    vi.mocked(compareAnchors).mockRejectedValue(new Error("hiro down"));
    expect((await compareReq(`?a=${A}&b=${B}`)).status).toBe(502);
  });
});
