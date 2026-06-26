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
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";

// hash reads real files off disk, so the suite writes fixtures to a temp dir.
// The optional --verify path hits searchByHash, which is mocked to stay off
// mainnet.
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

import { hashCommand } from "../src/commands/hash";
import { searchByHash, type SearchResult } from "../src/search";

const mockedSearchByHash = vi.mocked(searchByHash);

// SHA-256 of the ASCII bytes "hello", verified independently.
const HELLO_HASH =
  "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
const HEX_64 = /[0-9a-f]{64}/g;

let dir: string;
let helloFile: string;
let helloCopy: string;
let worldFile: string;
let missingFile: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "thesislock-cli-hash-"));
  helloFile = join(dir, "hello.txt");
  helloCopy = join(dir, "hello-copy.txt");
  worldFile = join(dir, "world.txt");
  missingFile = join(dir, "does-not-exist.txt");
  writeFileSync(helloFile, "hello");
  writeFileSync(helloCopy, "hello");
  writeFileSync(worldFile, "world");
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

describe("hash command", () => {
  it("prints a 64-character hex digest matching the file contents", async () => {
    await hashCommand([helloFile], {});
    expect(out()).toContain(HELLO_HASH);
    expect(out()).toMatch(HEX_64);
    expect(process.exitCode).toBe(0);
  });

  it("produces the same hash for identical file contents", async () => {
    await hashCommand([helloFile, helloCopy], {});
    const matches = out().match(HEX_64) ?? [];
    expect(matches.length).toBe(2);
    expect(matches[0]).toBe(HELLO_HASH);
    expect(matches[1]).toBe(HELLO_HASH);
  });

  it("prints one digest per file for multiple files", async () => {
    await hashCommand([helloFile, worldFile], {});
    const matches = out().match(HEX_64) ?? [];
    expect(matches.length).toBe(2);
    expect(matches[0]).toBe(HELLO_HASH);
    expect(matches[1]).not.toBe(HELLO_HASH);
  });

  it("checks the anchor with --verify and reports a hit", async () => {
    const sample: SearchResult = {
      hash: HELLO_HASH,
      label: "doc",
      owner: "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM",
      stacksBlock: 42,
      source: "single",
      verifyPath: `/v/${HELLO_HASH}`,
    };
    mockedSearchByHash.mockResolvedValue([sample]);
    await hashCommand([helloFile], { verify: true });
    expect(mockedSearchByHash).toHaveBeenCalledWith(HELLO_HASH);
    expect(out()).toContain("Verified");
    expect(process.exitCode).toBe(0);
  });

  it("reports a miss and exits 1 with --verify when not anchored", async () => {
    mockedSearchByHash.mockResolvedValue([]);
    await hashCommand([helloFile], { verify: true });
    expect(out()).toContain("Not Found");
    expect(process.exitCode).toBe(1);
  });

  it("shows an error and exits 1 for a missing file", async () => {
    await hashCommand([missingFile], {});
    expect(err()).toContain("Cannot read file");
    expect(process.exitCode).toBe(1);
  });

  it("outputs a JSON array with --json", async () => {
    await hashCommand([helloFile], { json: true });
    const parsed = JSON.parse(out());
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].hash).toBe(HELLO_HASH);
    expect(parsed[0].file).toBe(helloFile);
    expect(typeof parsed[0].size).toBe("number");
  });

  it("prints only the hash with --quiet", async () => {
    await hashCommand([helloFile], { quiet: true });
    expect(out().trim()).toBe(HELLO_HASH);
    expect(process.exitCode).toBe(0);
  });
});
