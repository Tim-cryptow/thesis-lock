"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { SparklineChart } from "@/app/components/performance/SparklineChart";
import {
  isPerfDebugEnabled,
  setPerfDebugEnabled,
} from "@/app/components/performance/PerformanceBanner";
import {
  type ApiSummary,
  type PageSummary,
  type Rating,
  type VitalSummary,
  type WebVitalName,
  PERF_FLUSH_EVENT,
  VITAL_NAMES,
  clearPerformanceData,
  getApiMetricsSummary,
  getPageMetricsSummary,
  getRecentVitalValues,
  getVitalsSummary,
} from "@/lib/performance";

type Range = "24h" | "7d" | "30d" | "all";

const RANGES: { id: Range; label: string; days?: number }[] = [
  { id: "24h", label: "Last 24h", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "all", label: "All time", days: undefined },
];

const VITAL_INFO: Record<WebVitalName, { unit: "ms" | "score"; description: string }> = {
  LCP: {
    unit: "ms",
    description: "Largest Contentful Paint: when the main content of the page becomes visible.",
  },
  INP: {
    unit: "ms",
    description: "Interaction to Next Paint: how quickly the page responds to interactions.",
  },
  CLS: {
    unit: "score",
    description: "Cumulative Layout Shift: how much the page unexpectedly shifts while loading.",
  },
  FCP: {
    unit: "ms",
    description: "First Contentful Paint: when the first content appears on screen.",
  },
  TTFB: {
    unit: "ms",
    description: "Time to First Byte: how long the server takes to start responding.",
  },
  FID: {
    unit: "ms",
    description: "First Input Delay: the delay before the page reacts to the first interaction.",
  },
};

function ratingLabel(rating: Rating): string {
  if (rating === "good") return "Good";
  if (rating === "needs-improvement") return "Needs improvement";
  return "Poor";
}

export function ratingBadgeClasses(rating: Rating): string {
  if (rating === "good") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  if (rating === "needs-improvement") {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  }
  return "bg-red-500/15 text-red-700 dark:text-red-400";
}

function formatVital(value: number, unit: "ms" | "score"): string {
  return unit === "score" ? value.toFixed(3) : `${Math.round(value)} ms`;
}

// Pages have no Web Vital threshold, so rate them by average load time.
function pageRating(avgLoad: number): Rating {
  if (avgLoad < 1000) return "good";
  if (avgLoad < 2500) return "needs-improvement";
  return "poor";
}

export default function PerformanceClient() {
  const [range, setRange] = useState<Range>("7d");
  const [vitals, setVitals] = useState<Record<string, VitalSummary>>({});
  const [pages, setPages] = useState<Record<string, PageSummary>>({});
  const [apis, setApis] = useState<Record<string, ApiSummary>>({});
  const [recent, setRecent] = useState<Record<string, number[]>>({});
  const [debug, setDebug] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const days = useMemo(() => RANGES.find((r) => r.id === range)?.days, [range]);

  useEffect(() => {
    // Ask the always-mounted tracker to flush the current session's LCP, CLS,
    // and INP before reading. The listener runs synchronously, so the values
    // are in the store by the time the summaries are computed below.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(PERF_FLUSH_EVENT));
    }
    setVitals(getVitalsSummary(days));
    setPages(getPageMetricsSummary(days));
    setApis(getApiMetricsSummary(days));
    const trends: Record<string, number[]> = {};
    for (const name of VITAL_NAMES) {
      trends[name] = getRecentVitalValues(name, 30, days);
    }
    setRecent(trends);
  }, [days, reloadKey]);

  const pageRows = useMemo(
    () => Object.entries(pages).sort((a, b) => b[1].avgLoad - a[1].avgLoad),
    [pages],
  );
  const apiRows = useMemo(
    () => Object.entries(apis).sort((a, b) => b[1].avgResponse - a[1].avgResponse),
    [apis],
  );

  const clearAll = () => {
    clearPerformanceData();
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    setDebug(isPerfDebugEnabled());
  }, []);

  const toggleDebug = () => {
    setDebug((prev) => {
      const next = !prev;
      setPerfDebugEnabled(next);
      return next;
    });
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          Home
        </Link>
        <Link href="/docs/performance" className="text-foreground/60 hover:text-foreground">
          Docs
        </Link>
        <span className="text-foreground font-medium">Performance</span>
      </div>

      <div className="mb-2 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl">Performance</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDebug}
            aria-pressed={debug}
            className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm hover:border-foreground/40 transition"
          >
            {debug ? "Disable debug banner" : "Enable debug banner"}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm hover:border-foreground/40 transition"
          >
            Clear data
          </button>
        </div>
      </div>
      <p className="text-foreground/70 mb-6">
        Web Vitals, page load, and API timings measured in your browser. Stored locally; nothing is
        sent anywhere.
      </p>

      <div className="mb-8 flex flex-wrap gap-1 border-b border-foreground/10">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              range === r.id
                ? "border-heading text-foreground"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <h2 className="mb-3 text-sm uppercase tracking-wide text-foreground/50">Web Vitals</h2>
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VITAL_NAMES.map((name) => {
          const summary = vitals[name];
          const info = VITAL_INFO[name];
          return (
            <div key={name} className="rounded-lg border border-foreground/10 bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-foreground/70">{name}</span>
                {summary ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ratingBadgeClasses(
                      summary.rating,
                    )}`}
                  >
                    {ratingLabel(summary.rating)}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className="font-mono text-2xl">
                  {summary ? formatVital(summary.p75, info.unit) : "n/a"}
                </span>
                {recent[name] && recent[name].length > 1 ? (
                  <SparklineChart values={recent[name]} rating={summary?.rating ?? "good"} />
                ) : null}
              </div>
              <p className="mt-2 text-xs text-foreground/55">{info.description}</p>
              <p className="mt-1 text-[10px] text-foreground/40">
                {summary
                  ? `p75 of ${summary.count} sample${summary.count === 1 ? "" : "s"}`
                  : "No data yet"}
              </p>
            </div>
          );
        })}
      </div>

      <h2 className="mb-3 text-sm uppercase tracking-wide text-foreground/50">Page Performance</h2>
      {pageRows.length === 0 ? (
        <p className="mb-10 rounded-lg border border-foreground/10 bg-card p-6 text-sm text-foreground/60">
          No page metrics yet.
        </p>
      ) : (
        <div className="mb-10 overflow-x-auto rounded-lg border border-foreground/10 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-foreground/60">
                <th className="px-4 py-2 font-medium">Page</th>
                <th className="px-4 py-2 text-right font-medium">Avg load</th>
                <th className="px-4 py-2 text-right font-medium">Avg render</th>
                <th className="px-4 py-2 text-right font-medium">Visits</th>
                <th className="px-4 py-2 font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(([path, s]) => {
                const rating = pageRating(s.avgLoad);
                return (
                  <tr
                    key={path}
                    className={`border-b border-foreground/5 ${
                      rating === "good" ? "" : "bg-amber-500/10"
                    }`}
                  >
                    <td className="break-all px-4 py-2 font-mono">{path}</td>
                    <td className="px-4 py-2 text-right">{Math.round(s.avgLoad)} ms</td>
                    <td className="px-4 py-2 text-right">{Math.round(s.avgRender)} ms</td>
                    <td className="px-4 py-2 text-right">{s.visits}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ratingBadgeClasses(
                          rating,
                        )}`}
                      >
                        {ratingLabel(rating)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-sm uppercase tracking-wide text-foreground/50">API Performance</h2>
      {apiRows.length === 0 ? (
        <p className="rounded-lg border border-foreground/10 bg-card p-6 text-sm text-foreground/60">
          No API metrics yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-foreground/10 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-foreground/60">
                <th className="px-4 py-2 font-medium">Endpoint</th>
                <th className="px-4 py-2 text-right font-medium">Avg response</th>
                <th className="px-4 py-2 text-right font-medium">Error rate</th>
                <th className="px-4 py-2 text-right font-medium">Calls</th>
                <th className="px-4 py-2 text-right font-medium">Cached</th>
              </tr>
            </thead>
            <tbody>
              {apiRows.map(([endpoint, s]) => {
                const highError = s.errorRate > 0.05;
                const slow = s.avgResponse > 1000;
                return (
                  <tr
                    key={endpoint}
                    className={`border-b border-foreground/5 ${
                      highError ? "bg-red-500/10" : slow ? "bg-amber-500/10" : ""
                    }`}
                  >
                    <td className="break-all px-4 py-2 font-mono">{endpoint}</td>
                    <td className="px-4 py-2 text-right">{Math.round(s.avgResponse)} ms</td>
                    <td
                      className={`px-4 py-2 text-right ${
                        highError ? "text-red-600 dark:text-red-400" : ""
                      }`}
                    >
                      {(s.errorRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 text-right">{s.calls}</td>
                    <td className="px-4 py-2 text-right">{Math.round(s.cachedRate * 100)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
