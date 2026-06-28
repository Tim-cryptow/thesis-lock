import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EnvValidationError, inspectEnv, validateEnv } from "../env";

const KEYS = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_CONTRACT_ADDRESS",
  "NEXT_PUBLIC_CONTRACT_NAME",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
] as const;

const VALID: Record<(typeof KEYS)[number], string> = {
  NEXT_PUBLIC_API_URL: "https://api.mainnet.hiro.so",
  NEXT_PUBLIC_CONTRACT_ADDRESS: "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM",
  NEXT_PUBLIC_CONTRACT_NAME: "thesislock",
  NEXT_PUBLIC_SITE_URL: "https://thesis-lock.vercel.app",
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
};

describe("env validation", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
    vi.restoreAllMocks();
  });

  it("reports all variables as missing when none are set", () => {
    const result = inspectEnv();
    expect(result.missing).toEqual([...KEYS]);
    expect(result.invalid).toHaveLength(0);
  });

  it("warns but does not throw when variables are unset", () => {
    expect(() => validateEnv()).not.toThrow();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("accepts a fully valid configuration with no warning", () => {
    for (const key of KEYS) {
      process.env[key] = VALID[key];
    }
    expect(() => validateEnv()).not.toThrow();
    expect(console.warn).not.toHaveBeenCalled();
    expect(inspectEnv()).toEqual({ missing: [], invalid: [] });
  });

  it("throws on a malformed URL", () => {
    process.env.NEXT_PUBLIC_API_URL = "not-a-url";
    expect(() => validateEnv()).toThrow(EnvValidationError);
  });

  it("throws on a malformed principal", () => {
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = "not-a-principal";
    const result = inspectEnv();
    expect(result.invalid.map((i) => i.name)).toContain("NEXT_PUBLIC_CONTRACT_ADDRESS");
    expect(() => validateEnv()).toThrow(/NEXT_PUBLIC_CONTRACT_ADDRESS/);
  });
});
