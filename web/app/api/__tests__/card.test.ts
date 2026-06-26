// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub next/og so the card route is exercised without real PNG rendering or
// font loading. Returning a Response from the constructor overrides `this`.
vi.mock("next/og", () => ({
  ImageResponse: class {
    constructor(_element: unknown, opts?: { headers?: Record<string, string> }) {
      return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
        headers: { "content-type": "image/png", ...(opts?.headers ?? {}) },
      });
    }
  },
}));
vi.mock("@/lib/verify", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/verify")>();
  return { ...actual, verifyHash: vi.fn() };
});

import { verifyHash } from "@/lib/verify";
import { GET } from "@/app/api/card/[hash]/route";
import { mockNextRequest, routeParams, BASE } from "./helpers";

const HASH = "a".repeat(64);

beforeEach(() => {
  vi.mocked(verifyHash).mockReset();
  vi.mocked(verifyHash).mockResolvedValue({
    verified: false,
    hash: HASH,
    message: "nope",
  });
});

function card(hash: string) {
  return GET(mockNextRequest(`${BASE}/api/card/${hash}`), {
    params: routeParams({ hash }),
  });
}

describe("GET /api/card/[hash]", () => {
  it("returns an image content type", async () => {
    const res = await card(HASH);
    expect(res.headers.get("content-type")).toContain("image/png");
  });

  it("returns a non-empty body", async () => {
    const buf = await (await card(HASH)).arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it("still returns an image for an invalid hash", async () => {
    const res = await card("xyz");
    expect(res.headers.get("content-type")).toContain("image/png");
    expect(verifyHash).not.toHaveBeenCalled();
  });

  it("looks up a valid hash", async () => {
    await card(HASH);
    expect(verifyHash).toHaveBeenCalledWith(HASH, undefined, expect.any(String));
  });
});
