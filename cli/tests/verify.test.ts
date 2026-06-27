import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import chalk from "chalk";

// The verify command's only on-chain dependency is searchByHash, so mock that
// seam to keep every case off mainnet. getBlockTime (via ../src/index) is
// exercised through a stubbed fetch that fails fast, so timestamps render as
// unavailable without any network call.
vi.mock("../src/search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/search")>();
  return { ...actual, searchByHash: vi.fn() };
});

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

import { verifyCommand } from "../src/commands/verify";
import { searchByHash, type SearchResult } from "../src/search";

const mockedSearchByHash = vi.mocked(searchByHash);

const HASH = "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06";
const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const sample: SearchResult = {
  hash: HASH,
  label: "thesis",
  owner: OWNER,
  stacksBlock: 100,
  source: "single",
  verifyPath: `/v/${HASH}`,
};

let logs: string[];
let errs: string[];

function out(): string {
  return logs.join("\n");
}
function err(): string {
  return errs.join("\n");
}

beforeEach(() => {
  // Force plain output so assertions match regardless of the runner's TTY.
  chalk.level = 0;
  logs = [];
  errs = [];
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errs.push(args.map(String).join(" "));
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
  mockedSearchByHash.mockReset();
  process.exitCode = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  process.exitCode = 0;
});

describe("verify command", () => {
  it("prints Verified and exits 0 for an anchored hash", async () => {
    mockedSearchByHash.mockResolvedValue([sample]);
    await verifyCommand(HASH, {});
    expect(out()).toContain("Verified");
    expect(process.exitCode).toBe(0);
  });

  it("prints Not Found and exits 1 for an unknown hash", async () => {
    mockedSearchByHash.mockResolvedValue([]);
    await verifyCommand(HASH, {});
    expect(out()).toContain("Not Found");
    expect(process.exitCode).toBe(1);
  });

  it("rejects an invalid hash format without calling the lookup", async () => {
    await verifyCommand("not-a-hash", {});
    expect(err()).toContain("Invalid hash");
    expect(process.exitCode).toBe(1);
    expect(mockedSearchByHash).not.toHaveBeenCalled();
  });

  it("normalizes an uppercase 0x-prefixed hash before looking it up", async () => {
    mockedSearchByHash.mockResolvedValue([sample]);
    await verifyCommand(`0x${HASH.toUpperCase()}`, {});
    expect(mockedSearchByHash).toHaveBeenCalledWith(HASH, undefined);
    expect(out()).toContain("Verified");
  });

  it("forwards --owner to the batch lookup", async () => {
    mockedSearchByHash.mockResolvedValue([sample]);
    await verifyCommand(HASH, { owner: OWNER });
    expect(mockedSearchByHash).toHaveBeenCalledWith(HASH, OWNER);
  });

  it("outputs valid JSON with --json for a verified hash", async () => {
    mockedSearchByHash.mockResolvedValue([sample]);
    await verifyCommand(HASH, { json: true });
    const parsed = JSON.parse(out());
    expect(parsed.hash).toBe(HASH);
    expect(parsed.verified).toBe(true);
    expect(parsed.count).toBe(1);
    expect(Array.isArray(parsed.results)).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  it("outputs verified=false JSON and exits 1 with --json for an unknown hash", async () => {
    mockedSearchByHash.mockResolvedValue([]);
    await verifyCommand(HASH, { json: true });
    const parsed = JSON.parse(out());
    expect(parsed.verified).toBe(false);
    expect(parsed.count).toBe(0);
    expect(process.exitCode).toBe(1);
  });

  it("prints only true with --quiet for a verified hash", async () => {
    mockedSearchByHash.mockResolvedValue([sample]);
    await verifyCommand(HASH, { quiet: true });
    expect(out().trim()).toBe("true");
    expect(process.exitCode).toBe(0);
  });

  it("prints only false and exits 1 with --quiet for an unknown hash", async () => {
    mockedSearchByHash.mockResolvedValue([]);
    await verifyCommand(HASH, { quiet: true });
    expect(out().trim()).toBe("false");
    expect(process.exitCode).toBe(1);
  });

  it("reports a lookup failure and exits 1", async () => {
    mockedSearchByHash.mockRejectedValue(new Error("network down"));
    await verifyCommand(HASH, {});
    expect(err()).toContain("network down");
    expect(process.exitCode).toBe(1);
  });
});
