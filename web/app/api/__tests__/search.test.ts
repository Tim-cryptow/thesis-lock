// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Neutralize the background webhook sweep the route schedules with after().
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: vi.fn() };
});
vi.mock("@/lib/search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/search")>();
  return { ...actual, runSearch: vi.fn() };
});

import { runSearch, type SearchResult } from "@/lib/search";
import { GET } from "@/app/api/search/route";
import { mockNextRequest, BASE } from "./helpers";

const HASH = "a".repeat(64);
const PRINCIPAL = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const sample: SearchResult = {
  hash: HASH,
  label: "thesis",
  owner: PRINCIPAL,
  stacksBlock: 100,
  source: "single",
  verifyUrl: `${BASE}/v/${HASH}`,
};

beforeEach(() => {
  vi.mocked(runSearch).mockReset();
});

describe("GET /api/search", () => {
  it("returns the search results array", async () => {
    vi.mocked(runSearch).mockResolvedValue([sample]);
    const res = await GET(mockNextRequest(`${BASE}/api/search?q=${HASH}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
  });

  it("returns 400 when q is missing", async () => {
    const res = await GET(mockNextRequest(`${BASE}/api/search`));
    expect(res.status).toBe(400);
    expect(runSearch).not.toHaveBeenCalled();
  });

  it("forces a hash search with type=hash", async () => {
    vi.mocked(runSearch).mockResolvedValue([]);
    await GET(mockNextRequest(`${BASE}/api/search?q=${HASH}&type=hash`));
    expect(runSearch).toHaveBeenCalledWith(HASH, "hash", undefined);
  });

  it("rejects an invalid hash when type=hash", async () => {
    const res = await GET(
      mockNextRequest(`${BASE}/api/search?q=notahash&type=hash`),
    );
    expect(res.status).toBe(400);
    expect(runSearch).not.toHaveBeenCalled();
  });

  it("forces a principal search with type=principal", async () => {
    vi.mocked(runSearch).mockResolvedValue([]);
    await GET(
      mockNextRequest(`${BASE}/api/search?q=${PRINCIPAL}&type=principal`),
    );
    expect(runSearch).toHaveBeenCalledWith(PRINCIPAL, "principal", undefined);
  });

  it("forces a label search with type=label", async () => {
    vi.mocked(runSearch).mockResolvedValue([]);
    await GET(mockNextRequest(`${BASE}/api/search?q=thesis&type=label`));
    expect(runSearch).toHaveBeenCalledWith("thesis", "label", undefined);
  });

  it("returns an empty array when there are no matches", async () => {
    vi.mocked(runSearch).mockResolvedValue([]);
    const res = await GET(mockNextRequest(`${BASE}/api/search?q=thesis`));
    expect(await res.json()).toEqual([]);
  });
});
