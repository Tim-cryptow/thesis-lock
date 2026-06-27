"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StatusIndicator from "@/app/components/StatusIndicator";
import IncidentTimeline from "./IncidentTimeline";
import {
  checkAllServices,
  getOverallStatus,
  getStatusHistory,
  getUptimePercentage,
  saveStatusHistory,
  type OverallStatus,
  type ServiceStatus,
  type ServiceStatusLevel,
  type StatusHistoryCheck,
} from "@/lib/statusMonitor";
import { reconcileIncidents } from "@/lib/incidents";

// The live view refreshes every minute; the history layer underneath samples at
// most once every five minutes, so the bars and uptime grow at a sane cadence.
const REFRESH_MS = 60_000;
const BAR_COUNT = 90;

const SECTIONS: { key: ServiceStatus["category"]; title: string }[] = [
  { key: "contract", title: "Smart Contracts" },
  { key: "api", title: "API Endpoints" },
  { key: "dependency", title: "Dependencies" },
];

const BAR_COLORS: Record<string, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
  unknown: "bg-foreground/10",
};

const OVERALL: Record<OverallStatus, { text: string; cls: string; level: ServiceStatusLevel }> = {
  "all-operational": {
    text: "All Systems Operational",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    level: "operational",
  },
  "partial-outage": {
    text: "Partial System Outage",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    level: "degraded",
  },
  "major-outage": {
    text: "Major Outage",
    cls: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    level: "down",
  },
};

const LOADING_BANNER = {
  text: "Checking status...",
  cls: "border-foreground/15 bg-foreground/5 text-foreground",
  level: "unknown" as ServiceStatusLevel,
};

function fmtTime(iso: string): string {
  if (!iso) return "never";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString();
}

function fmtMs(ms: number | null): string {
  return ms == null ? "n/a" : `${ms} ms`;
}

// Right-aligns the most recent checks and pads the left with no-data segments so
// the bar is always BAR_COUNT wide, like a GitHub status strip.
function buildBars(checks: StatusHistoryCheck[]): StatusHistoryCheck[] {
  const recent = checks.slice(-BAR_COUNT);
  const padCount = Math.max(0, BAR_COUNT - recent.length);
  const padding: StatusHistoryCheck[] = Array.from({ length: padCount }, () => ({
    timestamp: "",
    status: "unknown",
    responseTime: null,
  }));
  return [...padding, ...recent];
}

function ServiceRow({ service, tick }: { service: ServiceStatus; tick: number }) {
  // tick changes after each save so the history-derived bar and uptime re-read
  // localStorage; it is intentionally referenced to keep the dependency honest.
  void tick;
  const checks = getStatusHistory(service.name)[0]?.checks ?? [];
  const uptime = getUptimePercentage(service.name, 24);
  const bars = buildBars(checks);
  return (
    <div className="py-3 border-b border-foreground/10 last:border-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIndicator status={service.status} size="md" showText={false} />
          <span className="font-mono text-sm truncate">{service.name}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-foreground/60 shrink-0 tabular-nums">
          <span>{fmtMs(service.responseTime)}</span>
          <span>{uptime}% uptime</span>
        </div>
      </div>
      <div className="mt-2 flex items-stretch gap-[2px] h-6">
        {bars.map((bar, i) => (
          <span
            key={i}
            title={bar.timestamp ? `${fmtTime(bar.timestamp)}: ${bar.status}` : "no data"}
            className={`flex-1 rounded-sm ${BAR_COLORS[bar.status] ?? BAR_COLORS.unknown}`}
            style={{ minWidth: 2 }}
          />
        ))}
      </div>
      {service.message ? (
        <p className="mt-1 text-xs text-foreground/50">{service.message}</p>
      ) : null}
    </div>
  );
}

export default function StatusClient() {
  const [statuses, setStatuses] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState("");
  // Bumped after each save so history-derived UI (bars, uptime) re-reads.
  const [historyTick, setHistoryTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runChecks = useCallback(async () => {
    setChecking(true);
    try {
      const results = await checkAllServices();
      setStatuses(results);
      setLastChecked(new Date().toISOString());
      saveStatusHistory(results);
      reconcileIncidents(results);
      setHistoryTick((t) => t + 1);
    } finally {
      setChecking(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loop = async () => {
      if (!active) return;
      await runChecks();
      if (!active) return;
      timerRef.current = setTimeout(loop, REFRESH_MS);
    };
    void loop();
    return () => {
      active = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [runChecks]);

  const overall = getOverallStatus(statuses);
  const banner = loading ? LOADING_BANNER : OVERALL[overall];

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">System Status</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Live health of the ThesisLock contracts, API, and upstream dependencies. Checks run in
          your browser and refresh automatically.
        </p>
      </header>

      <div
        className={`rounded-lg border p-5 flex flex-wrap items-center justify-between gap-4 ${banner.cls}`}
      >
        <div className="flex items-center gap-3">
          <StatusIndicator status={banner.level} size="lg" showText={false} />
          <div>
            <div className="text-lg font-semibold">{banner.text}</div>
            <div className="text-xs opacity-80">Last checked {fmtTime(lastChecked)}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={runChecks}
          disabled={checking}
          className="rounded-md border border-foreground/20 bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-50"
        >
          {checking ? "Checking..." : "Check now"}
        </button>
      </div>

      <div className="mt-8 space-y-8">
        {SECTIONS.map((section) => {
          const rows = statuses.filter((s) => s.category === section.key);
          if (rows.length === 0 && !loading) return null;
          return (
            <section key={section.key}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50 mb-2">
                {section.title}
              </h2>
              <div className="rounded-lg border border-foreground/10 bg-card px-4">
                {rows.length === 0 ? (
                  <p className="py-6 text-sm text-foreground/50">Loading...</p>
                ) : (
                  rows.map((service) => (
                    <ServiceRow key={service.name} service={service} tick={historyTick} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10">
        <IncidentTimeline />
      </div>
    </main>
  );
}
