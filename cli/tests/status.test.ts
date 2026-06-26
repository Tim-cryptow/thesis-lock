import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Cl, serializeCV } from "@stacks/transactions";
import chalk from "chalk";

// status talks to the Hiro API directly (health) and through the SDK client
// (anchor count). A URL-routed fetch stub answers both shapes so no test
// reaches mainnet: the health endpoint returns a chain tip, and the read-only
// call returns a serialized Clarity uint that the real client parser decodes.
vi.mock("ora", () => {
  const spinner = {
    start: () => spinner,
    stop: () => spinner,
    succeed: () => spinner,
    fail: () => spinner,
    text: "",
  };
  return { default: () => spinner };
});

import { statusCommand } from "../src/commands/status";
import { CONTRACT_ADDRESS, CONTRACT_NAMES } from "../src/index";

const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
const LATEST_BLOCK = 123456;
// 9 appears in neither the owner principal nor the block height, so the
// substring assertion below can only match the rendered anchor count.
const ANCHOR_COUNT = 9;

function routedFetch(input: unknown): Promise<unknown> {
  const url = String(input);
  if (url.includes("/extended/")) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ready",
        chain_tip: { block_height: LATEST_BLOCK },
      }),
    });
  }
  if (url.includes("call-read") && url.includes("get-anchor-count")) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({
        okay: true,
        result: `0x${serializeCV(Cl.uint(ANCHOR_COUNT))}`,
      }),
    });
  }
  return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
}

let logs: string[];
let errs: string[];
const out = () => logs.join("\n");
const err = () => errs.join("\n");

beforeEach(() => {
  chalk.level = 0;
  delete process.env.THESISLOCK_API_URL;
  logs = [];
  errs = [];
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errs.push(args.map(String).join(" "));
  });
  vi.stubGlobal("fetch", vi.fn(routedFetch));
  process.exitCode = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  process.exitCode = 0;
});

describe("status command", () => {
  it("shows protocol status with the latest block height", async () => {
    await statusCommand();
    expect(out()).toContain("API endpoint");
    expect(out()).toContain(String(LATEST_BLOCK));
    expect(process.exitCode).toBe(0);
  });

  it("lists all five contract names", async () => {
    await statusCommand();
    for (const name of CONTRACT_NAMES) {
      expect(out()).toContain(`${CONTRACT_ADDRESS}.${name}`);
    }
    expect(CONTRACT_NAMES.length).toBe(5);
  });

  it("shows the anchor count for a principal argument", async () => {
    await statusCommand(OWNER);
    expect(out()).toContain(OWNER);
    expect(out()).toContain(String(ANCHOR_COUNT));
    expect(process.exitCode).toBe(0);
  });

  it("rejects an invalid principal with exit 1", async () => {
    await statusCommand("not-a-principal");
    expect(err()).toContain("Invalid Stacks principal");
    expect(process.exitCode).toBe(1);
  });

  it("emits valid JSON protocol status with --json", async () => {
    await statusCommand(undefined, { json: true });
    const parsed = JSON.parse(out());
    expect(parsed.healthy).toBe(true);
    expect(parsed.latestBlock).toBe(LATEST_BLOCK);
    expect(Array.isArray(parsed.contracts)).toBe(true);
    expect(parsed.contracts).toHaveLength(5);
  });

  it("emits valid JSON principal status with --json", async () => {
    await statusCommand(OWNER, { json: true });
    const parsed = JSON.parse(out());
    expect(parsed.principal).toBe(OWNER);
    expect(parsed.anchors).toBe(ANCHOR_COUNT);
  });
});
