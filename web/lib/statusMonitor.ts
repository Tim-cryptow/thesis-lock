// Health monitoring for the public status page. Probes the five Clarity
// contracts (through the Hiro contract-source endpoint), the app's own API
// endpoints, and the upstream Hiro and Stacks dependencies, measuring response
// time and classifying each as operational, degraded, or down. Recent results
// are kept in localStorage so the page can show uptime bars and percentages with
// no backend; the project has no database, so durable history lives in the
// browser.

export type ServiceCategory = "contract" | "api" | "dependency";

export type ServiceStatusLevel = "operational" | "degraded" | "down" | "unknown";

export type ServiceStatus = {
  name: string;
  category: ServiceCategory;
  status: ServiceStatusLevel;
  responseTime: number | null;
  lastChecked: string;
  message?: string;
};

export type StatusHistoryCheck = {
  timestamp: string;
  status: string;
  responseTime: number | null;
};

export type StatusHistory = {
  service: string;
  checks: StatusHistoryCheck[];
};

export type OverallStatus = "all-operational" | "partial-outage" | "major-outage";

const HISTORY_KEY = "thesislock_status_history";

// A 2xx response slower than this is reachable but flagged as degraded. Set
// generously so normal variance in the upstream Hiro calls is not mislabeled as
// a problem.
const DEGRADED_MS = 3000;
// A probe that takes longer than this is treated as down.
const TIMEOUT_MS = 8000;
// History is sampled at most this often, so a page that refreshes every minute
// still yields about one point per five minutes (~288 over 24h) as designed.
const SAMPLE_INTERVAL_MS = 5 * 60 * 1000;
// History older than this is pruned on every save.
const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;
// Hard cap of points per service, a safety bound regardless of cadence.
const MAX_POINTS = 300;

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const HIRO_API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mainnet.hiro.so";

// The five Clarity contracts deployed on mainnet, in the order shown on the
// status page.
export const CONTRACT_NAMES: string[] = [
  process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock",
  "thesislock-batch",
  "thesislock-registry",
  "thesislock-proof",
  "thesislock-groups",
];

// A fixed all-zero hash that exercises the per-hash badge route without
// depending on any anchored document.
const SAMPLE_HASH = "0".repeat(64);

// The API endpoints surfaced on the status page, each with the probe method that
// confirms liveness without side effects. verify and search are POST or query
// handlers, so an OPTIONS preflight (204) is the lightweight liveness check;
// badge is dynamic per hash, so a fixed sample hash exercises the route.
type ApiProbe = { name: string; path: string; method: "GET" | "OPTIONS" };
const API_PROBES: ApiProbe[] = [
  { name: "/api/health", path: "/api/health", method: "GET" },
  { name: "/api/verify", path: "/api/verify", method: "OPTIONS" },
  { name: "/api/search", path: "/api/search", method: "OPTIONS" },
  { name: "/api/stats", path: "/api/stats", method: "GET" },
  { name: "/api/badge", path: `/api/badge/${SAMPLE_HASH}`, method: "GET" },
];

function now(): number {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function levelFromTime(ms: number): ServiceStatusLevel {
  return ms > DEGRADED_MS ? "degraded" : "operational";
}

// Resolves a path against an origin. Absolute URLs pass through; relative paths
// use the supplied base (for server-side checks) or the current origin (in the
// browser).
function resolveUrl(endpoint: string, baseUrl?: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  const base = baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${endpoint}`;
}

type ProbeResult = {
  ok: boolean;
  httpStatus: number | null;
  responseTime: number | null;
  timedOut: boolean;
  error: boolean;
};

// A single fetch with a hard timeout and no retries, so the measured time
// reflects real latency rather than a masked, retried request.
async function probe(url: string, method: "GET" | "OPTIONS" = "GET"): Promise<ProbeResult> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  const start = now();
  try {
    const res = await fetch(url, {
      method,
      signal: controller?.signal,
      // Probes must reflect live state, never a cached response.
      cache: "no-store",
    });
    return {
      ok: res.ok,
      httpStatus: res.status,
      responseTime: Math.round(now() - start),
      timedOut: false,
      error: false,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      httpStatus: null,
      responseTime: timedOut ? null : Math.round(now() - start),
      timedOut,
      error: !timedOut,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function statusFromProbe(
  name: string,
  category: ServiceCategory,
  result: ProbeResult,
): ServiceStatus {
  const lastChecked = new Date().toISOString();
  if (result.timedOut) {
    return {
      name,
      category,
      status: "down",
      responseTime: null,
      lastChecked,
      message: "Request timed out",
    };
  }
  if (result.error) {
    return {
      name,
      category,
      status: "down",
      responseTime: null,
      lastChecked,
      message: "Network error",
    };
  }
  if (!result.ok) {
    return {
      name,
      category,
      status: "down",
      responseTime: result.responseTime,
      lastChecked,
      message: `HTTP ${result.httpStatus ?? "error"}`,
    };
  }
  const status = levelFromTime(result.responseTime ?? 0);
  return {
    name,
    category,
    status,
    responseTime: result.responseTime,
    lastChecked,
    message: status === "degraded" ? "Slow response" : undefined,
  };
}

// Verifies a contract is published by fetching its source from the Hiro node
// RPC. A 200 means the contract exists; anything else is treated as down.
export async function checkContractHealth(contractName: string): Promise<ServiceStatus> {
  const url = `${HIRO_API_BASE}/v2/contracts/source/${CONTRACT_ADDRESS}/${contractName}?proof=0`;
  return statusFromProbe(contractName, "contract", await probe(url, "GET"));
}

// Probes an API endpoint and reports whether it returned a 2xx. The optional
// settings carry the probe method and, for server-side checks, the origin to
// resolve a relative path against.
export async function checkApiHealth(
  endpoint: string,
  options?: { method?: "GET" | "OPTIONS"; baseUrl?: string; name?: string },
): Promise<ServiceStatus> {
  const url = resolveUrl(endpoint, options?.baseUrl);
  const result = await probe(url, options?.method ?? "GET");
  return statusFromProbe(options?.name ?? endpoint, "api", result);
}

// Pings the Hiro extended API status endpoint and reports it as a dependency.
export async function checkHiroHealth(): Promise<ServiceStatus> {
  const result = await probe("https://api.hiro.so/extended/v1/status", "GET");
  return statusFromProbe("Hiro Stacks API", "dependency", result);
}

// Checks the Stacks node RPC info endpoint, reflecting the underlying network's
// reachability separately from the Hiro application layer.
async function checkStacksNetworkHealth(baseUrl = HIRO_API_BASE): Promise<ServiceStatus> {
  const result = await probe(`${baseUrl}/v2/info`, "GET");
  return statusFromProbe("Stacks Network", "dependency", result);
}

// Runs every check concurrently and returns the full set of statuses. Pass a
// base URL when calling server-side so the API probes resolve to an absolute
// origin; in the browser the current origin is used automatically.
export async function checkAllServices(baseUrl?: string): Promise<ServiceStatus[]> {
  const contracts = CONTRACT_NAMES.map((name) => checkContractHealth(name));
  const apis = API_PROBES.map((p) =>
    checkApiHealth(p.path, { method: p.method, baseUrl, name: p.name }),
  );
  const dependencies = [checkHiroHealth(), checkStacksNetworkHealth(baseUrl)];
  return Promise.all([...contracts, ...apis, ...dependencies]);
}

// ---------------------------------------------------------------------------
// History, stored in localStorage and pruned to the last 24 hours.
// ---------------------------------------------------------------------------

function coerceCheck(value: unknown): StatusHistoryCheck | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.timestamp !== "string" || typeof v.status !== "string") {
    return null;
  }
  return {
    timestamp: v.timestamp,
    status: v.status,
    responseTime: typeof v.responseTime === "number" ? v.responseTime : null,
  };
}

function loadHistory(): StatusHistory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: StatusHistory[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const v = item as Record<string, unknown>;
      if (typeof v.service !== "string" || !Array.isArray(v.checks)) continue;
      const checks = v.checks.map(coerceCheck).filter((c): c is StatusHistoryCheck => c !== null);
      out.push({ service: v.service, checks });
    }
    return out;
  } catch {
    return [];
  }
}

// Records the latest statuses, sampling at most one point per service every five
// minutes so a fast UI refresh does not bloat the log, then prunes to the last
// 24 hours and the per-service cap.
export function saveStatusHistory(statuses: ServiceStatus[]): void {
  if (typeof window === "undefined") return;
  try {
    const byService = new Map(loadHistory().map((h) => [h.service, h]));
    const nowMs = Date.now();
    for (const s of statuses) {
      let entry = byService.get(s.name);
      if (!entry) {
        entry = { service: s.name, checks: [] };
        byService.set(s.name, entry);
      }
      const last = entry.checks[entry.checks.length - 1];
      if (last && nowMs - new Date(last.timestamp).getTime() < SAMPLE_INTERVAL_MS) {
        continue;
      }
      entry.checks.push({
        timestamp: s.lastChecked,
        status: s.status,
        responseTime: s.responseTime,
      });
    }
    const cutoff = nowMs - HISTORY_WINDOW_MS;
    const pruned: StatusHistory[] = [];
    for (const entry of byService.values()) {
      const checks = entry.checks
        .filter((c) => new Date(c.timestamp).getTime() >= cutoff)
        .slice(-MAX_POINTS);
      if (checks.length > 0) pruned.push({ service: entry.service, checks });
    }
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(pruned));
  } catch {
    // History is best-effort; failing to record never breaks the page.
  }
}

export function getStatusHistory(service?: string): StatusHistory[] {
  const history = loadHistory();
  return service ? history.filter((h) => h.service === service) : history;
}

// Uptime over the recent window: the share of checks that were reachable
// (operational or degraded). Checks with no measurement (unknown) are excluded,
// and a service with no recorded checks reports 100 (no downtime observed).
export function getUptimePercentage(service: string, hours = 24): number {
  const entry = loadHistory().find((h) => h.service === service);
  if (!entry) return 100;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const checks = entry.checks.filter(
    (c) => new Date(c.timestamp).getTime() >= cutoff && c.status !== "unknown",
  );
  if (checks.length === 0) return 100;
  const up = checks.filter((c) => c.status === "operational" || c.status === "degraded").length;
  return Math.round((up / checks.length) * 1000) / 10;
}

// Rolls the per-service statuses up into one banner state. Everything
// operational is all clear; a downed dependency or at least half the services
// down is a major outage; anything else not fully operational is partial.
export function getOverallStatus(statuses: ServiceStatus[]): OverallStatus {
  if (statuses.length === 0) return "all-operational";
  const down = statuses.filter((s) => s.status === "down");
  const dependencyDown = down.some((s) => s.category === "dependency");
  const notOperational = statuses.filter((s) => s.status !== "operational");
  if (notOperational.length === 0) return "all-operational";
  if (dependencyDown || down.length >= Math.ceil(statuses.length / 2)) {
    return "major-outage";
  }
  return "partial-outage";
}
