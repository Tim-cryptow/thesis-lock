// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/activityLog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/activityLog")>();
  return { ...actual, fetchActivityLog: vi.fn() };
});

import { fetchActivityLog, type ActivityPage, type ActivityEvent } from "@/lib/activityLog";
import { GET } from "@/app/api/activity/route";
import { mockNextRequest, BASE } from "./helpers";

const ADDR = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

function event(id: string, type: ActivityEvent["type"]): ActivityEvent {
  return {
    id,
    type,
    txId: `0x${id}`,
    blockHeight: 100,
    timestamp: "2026-06-01T00:00:00Z",
    details: {},
    contractName: "thesislock",
  };
}

const page: ActivityPage = {
  events: [event("1", "anchor"), event("2", "create-group")],
  total: 2,
  hasMore: false,
};

beforeEach(() => {
  vi.mocked(fetchActivityLog).mockReset();
  vi.mocked(fetchActivityLog).mockResolvedValue(page);
});

function activityReq(query: string) {
  return GET(mockNextRequest(`${BASE}/api/activity${query}`));
}

describe("GET /api/activity", () => {
  it("returns the events for a valid address", async () => {
    const res = await activityReq(`?address=${ADDR}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events).toHaveLength(2);
  });

  it("returns 400 when the address is missing", async () => {
    const res = await activityReq("");
    expect(res.status).toBe(400);
    expect(fetchActivityLog).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid address", async () => {
    expect((await activityReq("?address=not-valid")).status).toBe(400);
  });

  it("exposes a hasMore boolean", async () => {
    const body = await (await activityReq(`?address=${ADDR}`)).json();
    expect(typeof body.hasMore).toBe("boolean");
  });

  it("filters events by the type param", async () => {
    const body = await (await activityReq(`?address=${ADDR}&type=anchors`)).json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].type).toBe("anchor");
  });

  it("forwards the limit param to the lookup", async () => {
    await activityReq(`?address=${ADDR}&limit=5`);
    expect(fetchActivityLog).toHaveBeenCalledWith(ADDR, 0, 5);
  });
});
