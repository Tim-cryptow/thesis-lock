import { test, expect } from "@playwright/test";
import { KNOWN_ANCHORED_HASH, UNANCHORED_HASH } from "./constants";

test.describe("REST API", () => {
  test("GET /api/health returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.version).toBeTruthy();
    expect(body.contracts.thesislock).toContain(".thesislock");
  });

  test("GET /api/verify/<known> reports verified", async ({ request }) => {
    const res = await request.get(`/api/verify/${KNOWN_ANCHORED_HASH}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.verified).toBe(true);
    expect(body.hash).toBe(KNOWN_ANCHORED_HASH);
  });

  test("GET /api/verify/<random> reports not verified", async ({ request }) => {
    const res = await request.get(`/api/verify/${UNANCHORED_HASH}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.verified).toBe(false);
  });

  test("GET /api/badge/<known> returns an SVG", async ({ request }) => {
    const res = await request.get(`/api/badge/${KNOWN_ANCHORED_HASH}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/svg+xml");
    const body = await res.text();
    expect(body).toContain("<svg");
    expect(body).toContain("Verified");
  });

  test("GET /api/stats returns the expected fields", async ({ request }) => {
    const res = await request.get("/api/stats");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(typeof body.totalAnchors).toBe("number");
    expect(typeof body.uniqueWallets).toBe("number");
    expect(typeof body.contractsDeployed).toBe("number");
    expect(Array.isArray(body.anchorsByDay)).toBe(true);
  });
});
