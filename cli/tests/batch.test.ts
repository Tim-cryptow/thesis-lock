import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";

// batch walks a real directory tree and reuses the streamed hasher. Only the
// on-chain lookup (searchByHash, used by --verify) is mocked so the suite stays
// off mainnet.
vi.mock("../src/search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/search")>();
  return { ...actual, searchByHash: vi.fn() };
});

import { batchCommand } from "../src/commands/batch";
import { searchByHash, type SearchResult } from "../src/search";

const mockedSearchByHash = vi.mocked(searchByHash);

const HELLO_HASH =
  "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
const HEX_64 = /[0-9a-f]{64}/g;

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "thesislock-cli-batch-"));
  writeFileSync(join(dir, "a.txt"), "hello");
  writeFileSync(join(dir, "b.txt"), "world");
  writeFileSync(join(dir, "notes.log"), "log line");
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "sub", "c.txt"), "deep");
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

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
  mockedSearchByHash.mockReset();
  process.exitCode = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = 0;
});

describe("batch command", () => {
  it("hashes top-level files only by default", async () => {
    await batchCommand(dir, {});
    const matches = out().match(HEX_64) ?? [];
    expect(matches).toHaveLength(3);
    expect(out()).toContain(HELLO_HASH);
  });

  it("descends into subdirectories with --recursive", async () => {
    await batchCommand(dir, { recursive: true });
    const matches = out().match(HEX_64) ?? [];
    expect(matches).toHaveLength(4);
  });

  it("skips files matching --exclude globs", async () => {
    await batchCommand(dir, { exclude: "*.log" });
    const matches = out().match(HEX_64) ?? [];
    expect(matches).toHaveLength(2);
  });

  it("skips excluded directories when recursing", async () => {
    await batchCommand(dir, { recursive: true, exclude: "sub" });
    const matches = out().match(HEX_64) ?? [];
    expect(matches).toHaveLength(3);
  });

  it("outputs a JSON array with --json", async () => {
    await batchCommand(dir, { json: true });
    const parsed = JSON.parse(out());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(3);
    expect(typeof parsed[0].hash).toBe("string");
    expect(typeof parsed[0].path).toBe("string");
    expect(typeof parsed[0].size).toBe("number");
  });

  it("prints one hash per line with --quiet", async () => {
    await batchCommand(dir, { quiet: true });
    const lines = out().trim().split("\n");
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      expect(line).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("checks each hash with --verify", async () => {
    const sample: SearchResult = {
      hash: HELLO_HASH,
      label: "doc",
      owner: "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM",
      stacksBlock: 7,
      source: "single",
      verifyPath: `/v/${HELLO_HASH}`,
    };
    mockedSearchByHash.mockResolvedValue([sample]);
    await batchCommand(dir, { verify: true });
    expect(mockedSearchByHash).toHaveBeenCalled();
    expect(out()).toContain("Verified");
    expect(process.exitCode).toBe(0);
  });

  it("errors and exits 1 for a path that is not a directory", async () => {
    await batchCommand(join(dir, "a.txt"), {});
    expect(err()).toContain("Not a directory");
    expect(process.exitCode).toBe(1);
  });

  it("errors and exits 1 for a missing directory", async () => {
    await batchCommand(join(dir, "missing"), {});
    expect(err()).toContain("Cannot read directory");
    expect(process.exitCode).toBe(1);
  });
});
