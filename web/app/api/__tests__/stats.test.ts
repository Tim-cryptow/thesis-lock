// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn() };
});
vi.mock("@/lib/stats", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/stats")>();
  return { ...actual, fetchProtocolStats: vi.fn() };
});

import { fetchProtocolStats, type ProtocolStats } from "@/lib/stats";
import { GET } from "@/app/api/stats/route";

const stats: ProtocolStats = {
  totalAnchors: 42,
  totalBatchAnchors: 5,
  totalRegistrations: 10,
  totalTransactions: 57,
  uniqueWallets: 7,
  contractsDeployed: 3,
  firstAnchorBlock: 100,
  latestAnchorBlock: 200,
  anchorsByDay: [{ date: "2026-06-01", count: 3 }],
};

beforeEach(() => {
  vi.mocked(fetchProtocolStats).mockReset();
  vi.mocked(fetchProtocolStats).mockResolvedValue(stats);
});

describe("GET /api/stats", () => {
  it("returns 200", async () => {
    expect((await GET()).status).toBe(200);
  });

  it("reports totalAnchors as a number", async () => {
    const body = await (await GET()).json();
    expect(typeof body.totalAnchors).toBe("number");
  });

  it("reports uniqueWallets as a number", async () => {
    const body = await (await GET()).json();
    expect(typeof body.uniqueWallets).toBe("number");
  });

  it("reports contractsDeployed as a number", async () => {
    const body = await (await GET()).json();
    expect(typeof body.contractsDeployed).toBe("number");
  });

  it("includes the anchorsByDay array", async () => {
    const body = await (await GET()).json();
    expect(Array.isArray(body.anchorsByDay)).toBe(true);
    expect(body.anchorsByDay[0]).toMatchObject({
      date: expect.any(String),
      count: expect.any(Number),
    });
  });

  it("sets the cache-control header", async () => {
    expect((await GET()).headers.get("Cache-Control")).toBe("public, s-maxage=300");
  });

  it("returns 502 when the stats lookup fails", async () => {
    vi.mocked(fetchProtocolStats).mockRejectedValue(new Error("hiro down"));
    expect((await GET()).status).toBe(502);
  });
});
