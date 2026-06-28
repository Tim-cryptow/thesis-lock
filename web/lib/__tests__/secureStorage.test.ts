import { beforeEach, describe, expect, it } from "vitest";
import { getAuditLog } from "../audit";
import { getJSON, safeGet, safeRemove, safeSet, setJSON } from "../secureStorage";

describe("secureStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("round-trips string values", () => {
    expect(safeSet("k", "v")).toBe(true);
    expect(safeGet("k")).toBe("v");
  });

  it("round-trips JSON and falls back on missing or corrupt data", () => {
    setJSON("obj", { a: 1 });
    expect(getJSON("obj", { a: 0 })).toEqual({ a: 1 });
    expect(getJSON("absent", "fallback")).toBe("fallback");
    safeSet("bad", "{not json");
    expect(getJSON("bad", "fallback")).toBe("fallback");
  });

  it("removes values", () => {
    safeSet("k", "v");
    expect(safeRemove("k")).toBe(true);
    expect(safeGet("k")).toBeNull();
  });

  it("supports the session backend independently of local", () => {
    safeSet("s", "v", "session");
    expect(safeGet("s", "session")).toBe("v");
    expect(safeGet("s", "local")).toBeNull();
  });

  it("writes an audit entry only when requested", () => {
    safeSet("thesislock.untracked", "v");
    expect(getAuditLog()).toHaveLength(0);

    safeSet("thesislock.tracked", "v", "local", { audit: true });
    const log = getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0]?.action).toBe("storage_write");
    expect(log[0]?.target).toBe("thesislock.tracked");
  });

  it("never audits the audit log's own keys (recursion safety)", () => {
    safeSet("thesislock_audit_scratch", "v", "local", { audit: true });
    safeRemove("thesislock_audit_scratch", "local", { audit: true });
    expect(getAuditLog()).toHaveLength(0);
  });
});
