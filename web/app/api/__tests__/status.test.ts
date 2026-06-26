// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/statusServerHistory", () => ({ recordServerSnapshot: vi.fn() }));
vi.mock("@/lib/statusMonitor", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/statusMonitor")>();
  return { ...actual, checkAllServices: vi.fn() };
});

import { checkAllServices, type ServiceStatus } from "@/lib/statusMonitor";
import { GET } from "@/app/api/status/route";
import { GET as BADGE } from "@/app/api/status/badge/route";
import { mockNextRequest, BASE } from "./helpers";

const services: ServiceStatus[] = [
  {
    name: "/api/health",
    category: "api",
    status: "operational",
    responseTime: 12,
    lastChecked: "2026-06-01T00:00:00Z",
  },
  {
    name: "thesislock",
    category: "contract",
    status: "operational",
    responseTime: 30,
    lastChecked: "2026-06-01T00:00:00Z",
  },
];

beforeEach(() => {
  vi.mocked(checkAllServices).mockReset();
  vi.mocked(checkAllServices).mockResolvedValue(services);
});

describe("GET /api/status", () => {
  it("returns an overall status string and a services array", async () => {
    const res = await GET(mockNextRequest(`${BASE}/api/status`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.overall).toBe("string");
    expect(Array.isArray(body.services)).toBe(true);
  });

  it("derives all-operational when every service is up", async () => {
    const body = await (await GET(mockNextRequest(`${BASE}/api/status`))).json();
    expect(body.overall).toBe("all-operational");
  });

  it("gives each service a name and status", async () => {
    const body = await (await GET(mockNextRequest(`${BASE}/api/status`))).json();
    for (const service of body.services) {
      expect(typeof service.name).toBe("string");
      expect(typeof service.status).toBe("string");
    }
  });

  it("includes a timestamp", async () => {
    const body = await (await GET(mockNextRequest(`${BASE}/api/status`))).json();
    expect(typeof body.timestamp).toBe("string");
  });
});

describe("GET /api/status/badge", () => {
  it("returns an SVG document", async () => {
    const res = await BADGE(mockNextRequest(`${BASE}/api/status/badge`));
    expect(res.headers.get("Content-Type")).toContain("image/svg+xml");
    expect((await res.text()).startsWith("<svg")).toBe(true);
  });
});
