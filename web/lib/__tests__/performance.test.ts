import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  recordVital,
  getVitalsSummary,
  getRecentVitalValues,
  ratingFor,
  recordApiMetric,
  getApiMetricsSummary,
  clearPerformanceData,
  isPerfTrackingEnabled,
  setPerfTrackingEnabled,
  type WebVital,
  type WebVitalName,
  type ApiMetric,
} from "../performance";
import { installMemoryStorage } from "./memoryStorage";

const TS = "2026-06-26T00:00:00.000Z";

function vital(name: WebVitalName, value: number): WebVital {
  return { name, value, rating: ratingFor(name, value), timestamp: TS, path: "/" };
}

function api(endpoint: string, status: number, cached: boolean): ApiMetric {
  return { endpoint, method: "GET", responseTime: 100, status, timestamp: TS, cached };
}

beforeEach(() => {
  installMemoryStorage();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("recordVital / getVitalsSummary", () => {
  it("averages recorded values and counts them", () => {
    recordVital(vital("LCP", 1000));
    recordVital(vital("LCP", 2000));
    recordVital(vital("LCP", 3000));
    const summary = getVitalsSummary();
    expect(summary.LCP!.avg).toBe(2000);
    expect(summary.LCP!.count).toBe(3);
  });

  it("returns an empty summary when nothing is recorded", () => {
    expect(getVitalsSummary()).toEqual({});
  });
});

describe("ratingFor", () => {
  it("rates against the Core Web Vitals thresholds", () => {
    expect(ratingFor("LCP", 1000)).toBe("good");
    expect(ratingFor("LCP", 3000)).toBe("needs-improvement");
    expect(ratingFor("LCP", 5000)).toBe("poor");
  });
});

describe("ring buffer", () => {
  it("keeps only the most recent 500 vitals", () => {
    for (let i = 0; i < 510; i += 1) recordVital(vital("LCP", i));
    expect(getRecentVitalValues("LCP", 1000)).toHaveLength(500);
  });
});

describe("getRecentVitalValues", () => {
  it("returns values oldest to newest, limited to the requested count", () => {
    recordVital(vital("LCP", 1));
    recordVital(vital("LCP", 2));
    recordVital(vital("LCP", 3));
    expect(getRecentVitalValues("LCP", 10)).toEqual([1, 2, 3]);
    expect(getRecentVitalValues("LCP", 2)).toEqual([2, 3]);
  });
});

describe("recordApiMetric / getApiMetricsSummary", () => {
  it("computes error rate, cached rate, and call count per endpoint", () => {
    recordApiMetric(api("/api/x", 200, true));
    recordApiMetric(api("/api/x", 500, false));
    const summary = getApiMetricsSummary();
    expect(summary["/api/x"]!.calls).toBe(2);
    expect(summary["/api/x"]!.errorRate).toBe(0.5);
    expect(summary["/api/x"]!.cachedRate).toBe(0.5);
    expect(summary["/api/x"]!.avgResponse).toBe(100);
  });

  it("counts a status of 0 (network failure) as an error", () => {
    recordApiMetric(api("/api/y", 0, false));
    expect(getApiMetricsSummary()["/api/y"]!.errorRate).toBe(1);
  });
});

describe("clearPerformanceData", () => {
  it("removes all stored metrics", () => {
    recordVital(vital("LCP", 1000));
    recordApiMetric(api("/api/x", 200, false));
    clearPerformanceData();
    expect(getVitalsSummary()).toEqual({});
    expect(getApiMetricsSummary()).toEqual({});
  });
});

describe("tracking toggle", () => {
  it("is enabled by default", () => {
    expect(isPerfTrackingEnabled()).toBe(true);
  });

  it("stops recording when disabled", () => {
    setPerfTrackingEnabled(false);
    recordVital(vital("LCP", 1000));
    expect(getVitalsSummary()).toEqual({});
  });
});
