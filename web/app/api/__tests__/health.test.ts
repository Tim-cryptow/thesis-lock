// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200", () => {
    expect(GET().status).toBe(200);
  });

  it("reports status ok", async () => {
    const body = await GET().json();
    expect(body.status).toBe("ok");
  });

  it("lists the contract identifiers", async () => {
    const body = await GET().json();
    expect(body.contracts).toMatchObject({
      thesislock: expect.stringContaining(".thesislock"),
      batch: expect.stringContaining(".thesislock-batch"),
      registry: expect.stringContaining(".thesislock-registry"),
    });
  });

  it("includes a version string", async () => {
    const body = await GET().json();
    expect(typeof body.version).toBe("string");
  });

  it("sets cache and CORS headers", () => {
    const res = GET();
    expect(res.headers.get("Cache-Control")).toBe("public, s-maxage=60");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
