import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  logAudit,
  getAuditLog,
  computeIntegrityHash,
  integrityPayload,
  getStoredIntegrityHash,
  clearAuditLog,
  generateAuditReport,
  formatAuditCsv,
  isAuditEnabled,
  setAuditEnabled,
  getAuditRetentionDays,
  setAuditRetentionDays,
  type AuditCategory,
} from "../audit";
import { installMemoryStorage } from "./memoryStorage";

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

function log(
  action: string,
  category: AuditCategory,
  actor: string | null = null,
  metadata: Record<string, unknown> = {},
) {
  return logAudit({ action, category, actor, target: null, metadata, ipHash: null });
}

describe("logAudit", () => {
  it("persists an entry and fills in id, timestamp, and session id", () => {
    const entry = log("file_anchored", "anchor");
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(entry.sessionId).toBeTruthy();
    expect(getAuditLog()).toHaveLength(1);
  });

  it("records entries in chronological order", () => {
    log("first", "verify");
    log("second", "verify");
    expect(getAuditLog().map((e) => e.action)).toEqual(["first", "second"]);
  });
});

describe("getAuditLog filters", () => {
  beforeEach(() => {
    log("anchored", "anchor", "SP1");
    log("verified", "verify", "SP2");
    log("searched", "search", "SP1");
  });

  it("filters by category", () => {
    expect(getAuditLog({ category: "verify" }).map((e) => e.action)).toEqual(["verified"]);
  });

  it("filters by actor substring", () => {
    expect(getAuditLog({ actor: "sp1" })).toHaveLength(2);
  });

  it("filters by action substring", () => {
    expect(getAuditLog({ action: "anchor" }).map((e) => e.action)).toEqual(["anchored"]);
  });

  it("filters by a date range", () => {
    expect(getAuditLog({ dateFrom: "2099-01-01T00:00:00.000Z" })).toEqual([]);
    expect(getAuditLog({ dateTo: "2000-01-01T00:00:00.000Z" })).toEqual([]);
  });
});

describe("computeIntegrityHash", () => {
  it("hashes the empty log to a 64-character hex digest", () => {
    expect(computeIntegrityHash([])).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same entries", () => {
    log("a", "anchor");
    log("b", "verify");
    const entries = getAuditLog();
    expect(computeIntegrityHash(entries)).toBe(computeIntegrityHash(getAuditLog()));
  });

  it("changes when any field is altered", () => {
    log("a", "anchor");
    const entries = getAuditLog();
    const before = computeIntegrityHash(entries);
    const mutated = entries.map((e) => ({ ...e, action: `${e.action}!` }));
    expect(computeIntegrityHash(mutated)).not.toBe(before);
  });

  it("exposes a stable canonical payload", () => {
    log("a", "anchor");
    const entries = getAuditLog();
    expect(integrityPayload(entries)).toBe(integrityPayload(getAuditLog()));
  });

  it("advances the stored baseline on a clean log", () => {
    log("a", "anchor");
    expect(getStoredIntegrityHash()).toBe(computeIntegrityHash(getAuditLog()));
  });
});

describe("clearAuditLog", () => {
  it("empties the log", () => {
    log("a", "anchor");
    clearAuditLog();
    expect(getAuditLog()).toEqual([]);
  });
});

describe("generateAuditReport", () => {
  it("totals actions, breaks them down, and counts unique actors", () => {
    log("anchored", "anchor", "SP1");
    log("anchored", "anchor", "SP1");
    log("verified", "verify", "SP2");
    const report = generateAuditReport(getAuditLog());
    expect(report.totalActions).toBe(3);
    expect(report.actionBreakdown.anchored).toBe(2);
    expect(report.uniqueActors).toBe(2);
    expect(report.integrityHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("formatAuditCsv", () => {
  it("emits a header row and quotes values with commas", () => {
    log("did a, thing", "anchor");
    const csv = formatAuditCsv(getAuditLog());
    const [header, firstRow] = csv.split("\r\n");
    expect(header).toBe(
      "id,timestamp,action,category,actor,target,sessionId,ipHash,userAgent,metadata",
    );
    expect(firstRow).toContain('"did a, thing"');
  });
});

describe("settings", () => {
  it("does not persist when tracking is disabled", () => {
    setAuditEnabled(false);
    expect(isAuditEnabled()).toBe(false);
    log("a", "anchor");
    expect(getAuditLog()).toEqual([]);
  });

  it("round-trips the retention setting", () => {
    setAuditRetentionDays(7);
    expect(getAuditRetentionDays()).toBe(7);
  });
});
