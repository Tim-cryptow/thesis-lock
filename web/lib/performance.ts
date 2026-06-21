// Client-side performance metrics store. Web Vitals, page load timings, and API
// response times are captured in the browser and kept in small localStorage ring
// buffers. Nothing is sent anywhere: the performance dashboard reads straight
// from here. Every writer is SSR-safe and no-ops when there is no window, so the
// same helpers can be called from code that also runs during server rendering.

export type WebVitalName = "CLS" | "FID" | "FCP" | "LCP" | "TTFB" | "INP";
export type Rating = "good" | "needs-improvement" | "poor";

export type WebVital = {
  name: WebVitalName;
  value: number;
  rating: Rating;
  timestamp: string;
  path: string;
};

export type PageMetric = {
  path: string;
  loadTime: number;
  renderTime: number;
  timestamp: string;
  resourceCount: number;
  transferSize: number;
};

export type ApiMetric = {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  timestamp: string;
  cached: boolean;
};

const VITALS_KEY = "thesislock.perf.vitals";
const PAGES_KEY = "thesislock.perf.pages";
const API_KEY = "thesislock.perf.api";
// When disabled in settings, no metrics are recorded. Defaults to on.
const TRACKING_KEY = "thesislock.perf.enabled";

export function isPerfTrackingEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(TRACKING_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setPerfTrackingEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRACKING_KEY, enabled ? "1" : "0");
  } catch {
    // Non-fatal if persistence is unavailable.
  }
}

const VITALS_CAP = 500;
const PAGES_CAP = 200;
const API_CAP = 500;

export const VITAL_NAMES: WebVitalName[] = [
  "LCP",
  "INP",
  "CLS",
  "FCP",
  "TTFB",
  "FID",
];

// LCP, CLS, and INP are only known to be final once the page is hidden, but the
// tracker lives for the whole SPA session and never unmounts on navigation. The
// dashboard dispatches this event before it reads so the current session's
// vitals are flushed to the store first, instead of showing no data.
export const PERF_FLUSH_EVENT = "thesislock:perf-flush";

// Google's Core Web Vitals thresholds: at or below `good` is good, at or below
// `poor` needs improvement, above `poor` is poor.
const THRESHOLDS: Record<WebVitalName, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

export function ratingFor(name: WebVitalName, value: number): Rating {
  const t = THRESHOLDS[name];
  if (!t) return "good";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

function canUseDom(): boolean {
  return typeof window !== "undefined";
}

function load<T>(key: string): T[] {
  if (!canUseDom()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function append<T>(key: string, item: T, cap: number): void {
  if (!canUseDom()) return;
  if (!isPerfTrackingEnabled()) return;
  try {
    const arr = load<T>(key);
    arr.push(item);
    // Ring buffer: keep only the most recent `cap` entries.
    window.localStorage.setItem(key, JSON.stringify(arr.slice(-cap)));
  } catch {
    // localStorage may be full or unavailable; metrics are best effort.
  }
}

export function recordVital(vital: WebVital): void {
  append(VITALS_KEY, vital, VITALS_CAP);
}

export function recordPageMetric(metric: PageMetric): void {
  append(PAGES_KEY, metric, PAGES_CAP);
}

export function recordApiMetric(metric: ApiMetric): void {
  append(API_KEY, metric, API_CAP);
}

export function clearPerformanceData(): void {
  if (!canUseDom()) return;
  try {
    window.localStorage.removeItem(VITALS_KEY);
    window.localStorage.removeItem(PAGES_KEY);
    window.localStorage.removeItem(API_KEY);
  } catch {
    // ignore
  }
}

function withinDays<T extends { timestamp: string }>(
  rows: T[],
  days?: number,
): T[] {
  if (!days || days <= 0) return rows;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return rows.filter((r) => {
    const t = new Date(r.timestamp).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// Nearest-rank percentile on a copy sorted ascending.
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index];
}

export type VitalSummary = {
  avg: number;
  p75: number;
  p95: number;
  rating: Rating;
  count: number;
};

export function getVitalsSummary(
  days?: number,
): Record<string, VitalSummary> {
  const rows = withinDays(load<WebVital>(VITALS_KEY), days);
  const byName = new Map<WebVitalName, number[]>();
  for (const row of rows) {
    const list = byName.get(row.name) ?? [];
    list.push(row.value);
    byName.set(row.name, list);
  }
  const out: Record<string, VitalSummary> = {};
  for (const [name, values] of byName) {
    const p75 = percentile(values, 75);
    out[name] = {
      avg: average(values),
      p75,
      p95: percentile(values, 95),
      // The dashboard rates a metric by its p75, matching how Web Vitals reports.
      rating: ratingFor(name, p75),
      count: values.length,
    };
  }
  return out;
}

export type PageSummary = {
  avgLoad: number;
  avgRender: number;
  visits: number;
};

export function getPageMetricsSummary(
  days?: number,
): Record<string, PageSummary> {
  const rows = withinDays(load<PageMetric>(PAGES_KEY), days);
  const byPath = new Map<string, PageMetric[]>();
  for (const row of rows) {
    const list = byPath.get(row.path) ?? [];
    list.push(row);
    byPath.set(row.path, list);
  }
  const out: Record<string, PageSummary> = {};
  for (const [path, list] of byPath) {
    out[path] = {
      avgLoad: average(list.map((m) => m.loadTime)),
      avgRender: average(list.map((m) => m.renderTime)),
      visits: list.length,
    };
  }
  return out;
}

export type ApiSummary = {
  avgResponse: number;
  errorRate: number;
  calls: number;
  cachedRate: number;
};

export function getApiMetricsSummary(
  days?: number,
): Record<string, ApiSummary> {
  const rows = withinDays(load<ApiMetric>(API_KEY), days);
  const byEndpoint = new Map<string, ApiMetric[]>();
  for (const row of rows) {
    const list = byEndpoint.get(row.endpoint) ?? [];
    list.push(row);
    byEndpoint.set(row.endpoint, list);
  }
  const out: Record<string, ApiSummary> = {};
  for (const [endpoint, list] of byEndpoint) {
    // status 0 marks a network-level failure (fetch rejected: offline, DNS,
    // CORS, or a dropped connection), which must count as an error even though
    // it is below 400, otherwise an outage can read as a 0% error rate.
    const errors = list.filter((m) => m.status === 0 || m.status >= 400).length;
    const cached = list.filter((m) => m.cached).length;
    out[endpoint] = {
      avgResponse: average(list.map((m) => m.responseTime)),
      errorRate: list.length ? errors / list.length : 0,
      calls: list.length,
      cachedRate: list.length ? cached / list.length : 0,
    };
  }
  return out;
}

// Most recent measured values for one vital, oldest to newest, for sparklines.
export function getRecentVitalValues(
  name: WebVitalName,
  limit = 30,
  days?: number,
): number[] {
  return withinDays(load<WebVital>(VITALS_KEY), days)
    .filter((v) => v.name === name)
    .slice(-limit)
    .map((v) => v.value);
}
