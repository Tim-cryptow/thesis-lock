import { beforeEach, describe, expect, it } from "vitest";
import chalk from "chalk";
import {
  field,
  formatError,
  formatSize,
  stripAnsi,
  toJson,
} from "../src/output";

const ESC = String.fromCharCode(27);

beforeEach(() => {
  // Default to plain output; individual cases opt into color where needed.
  chalk.level = 0;
});

describe("stripAnsi", () => {
  it("removes color escape sequences", () => {
    expect(stripAnsi(`${ESC}[32mgreen${ESC}[39m`)).toBe("green");
  });

  it("strips real chalk output", () => {
    chalk.level = 1;
    const colored = chalk.red("error");
    expect(colored).not.toBe("error");
    expect(stripAnsi(colored)).toBe("error");
  });

  it("leaves plain strings unchanged", () => {
    expect(stripAnsi("plain text")).toBe("plain text");
  });
});

describe("toJson", () => {
  it("pretty-prints with two-space indentation", () => {
    const json = toJson({ a: 1, b: ["x"] });
    expect(json).toContain("\n");
    expect(json).toContain("  ");
    expect(JSON.parse(json)).toEqual({ a: 1, b: ["x"] });
  });

  it("round-trips arrays", () => {
    expect(JSON.parse(toJson([1, 2, 3]))).toEqual([1, 2, 3]);
  });
});

describe("field", () => {
  it("renders a label and value", () => {
    expect(field("Hash", "abc123")).toBe("Hash: abc123");
  });
});

describe("formatError", () => {
  it("returns plain red text by default", () => {
    expect(formatError("boom")).toBe("boom");
  });

  it("returns a JSON error object in --json mode", () => {
    expect(JSON.parse(formatError("boom", true))).toEqual({ error: "boom" });
  });
});

describe("formatSize", () => {
  it("formats bytes", () => {
    expect(formatSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatSize(1024 * 1024 * 2)).toBe("2.0 MB");
  });
});
