import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import chalk from "chalk";

// Mock the runSearch data layer but keep the real detectSearchType, so the
// tests prove the command routes hash, principal, and label queries correctly
// without any mainnet traffic.
vi.mock("../src/search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/search")>();
  return { ...actual, runSearch: vi.fn() };
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

import { searchCommand } from "../src/commands/search";
import { runSearch, type SearchResult } from "../src/search";

const mockedRunSearch = vi.mocked(runSearch);

const HASH =
  "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06";
const HASH2 = "a".repeat(64);
const HASH3 = "b".repeat(64);
const OWNER = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

function result(hash: string): SearchResult {
  return {
    hash,
    label: "thesis chapter",
    owner: OWNER,
    stacksBlock: 100,
    source: "single",
    verifyPath: `/v/${hash}`,
  };
}

let logs: string[];
let errs: string[];
const out = () => logs.join("\n");
const err = () => errs.join("\n");

beforeEach(() => {
  chalk.level = 0;
  logs = [];
  errs = [];
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  });
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errs.push(args.map(String).join(" "));
  });
  mockedRunSearch.mockReset();
  process.exitCode = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

describe("search command", () => {
  it("routes a 64-hex query as a hash search", async () => {
    mockedRunSearch.mockResolvedValue([result(HASH)]);
    await searchCommand(HASH, {});
    expect(mockedRunSearch).toHaveBeenCalledWith(HASH, "hash");
    expect(out()).toContain("1 result");
  });

  it("routes a Stacks principal query as a principal search", async () => {
    mockedRunSearch.mockResolvedValue([result(HASH)]);
    await searchCommand(OWNER, {});
    expect(mockedRunSearch).toHaveBeenCalledWith(OWNER, "principal");
    expect(out()).toContain("1 result");
  });

  it("routes free text as a label search", async () => {
    mockedRunSearch.mockResolvedValue([result(HASH)]);
    await searchCommand("thesis", {});
    expect(mockedRunSearch).toHaveBeenCalledWith("thesis", "label");
    expect(out()).toContain("1 result");
  });

  it("prints No results found and exits 1 when nothing matches", async () => {
    mockedRunSearch.mockResolvedValue([]);
    await searchCommand(HASH, {});
    expect(out() + err()).toContain("No results found");
    expect(process.exitCode).toBe(1);
  });

  it("outputs a JSON array with --json", async () => {
    mockedRunSearch.mockResolvedValue([result(HASH)]);
    await searchCommand(HASH, { json: true });
    const parsed = JSON.parse(out());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].hash).toBe(HASH);
  });

  it("respects --limit", async () => {
    mockedRunSearch.mockResolvedValue([
      result(HASH),
      result(HASH2),
      result(HASH3),
    ]);
    await searchCommand(HASH, { json: true, limit: 2 });
    const parsed = JSON.parse(out());
    expect(parsed).toHaveLength(2);
  });

  it("prints one hash per line with --quiet", async () => {
    mockedRunSearch.mockResolvedValue([result(HASH), result(HASH2)]);
    await searchCommand(HASH, { quiet: true });
    const lines = out().trim().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(HASH);
    expect(lines[1]).toBe(HASH2);
  });

  it("reports a search failure and exits 1", async () => {
    mockedRunSearch.mockRejectedValue(new Error("upstream boom"));
    await searchCommand(HASH, {});
    expect(err()).toContain("upstream boom");
    expect(process.exitCode).toBe(1);
  });
});
