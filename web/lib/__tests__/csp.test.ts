import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildCspDirectives,
  generateNonce,
  serializeCsp,
} from "../csp";

describe("buildContentSecurityPolicy", () => {
  it("emits the hardened structural directives", () => {
    const csp = buildContentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("https://api.mainnet.hiro.so");
  });

  it("omits unsafe-eval in production and includes it in development", () => {
    expect(buildContentSecurityPolicy({ isDev: false })).not.toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy({ isDev: true })).toContain("'unsafe-eval'");
  });

  it("adds a nonce to script-src when supplied", () => {
    const directives = buildCspDirectives({ nonce: "abc123" });
    expect(directives["script-src"] ?? []).toContain("'nonce-abc123'");
  });

  it("merges and de-duplicates extra connect-src origins", () => {
    const directives = buildCspDirectives({ connectSrc: ["https://example.test", "'self'"] });
    const connect = directives["connect-src"] ?? [];
    expect(connect).toContain("https://example.test");
    expect(connect.filter((v) => v === "'self'")).toHaveLength(1);
  });
});

describe("serializeCsp", () => {
  it("joins directives with semicolons and spaces", () => {
    expect(serializeCsp({ "default-src": ["'self'"], "object-src": ["'none'"] })).toBe(
      "default-src 'self'; object-src 'none'",
    );
  });
});

describe("generateNonce", () => {
  it("returns a non-empty base64 nonce that decodes to 16 bytes", () => {
    const nonce = generateNonce();
    expect(nonce.length).toBeGreaterThan(0);
    expect(atob(nonce)).toHaveLength(16);
  });

  it("returns a different value on each call", () => {
    expect(generateNonce()).not.toBe(generateNonce());
  });
});
