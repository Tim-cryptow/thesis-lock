"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import {
  type Rating,
  type VitalSummary,
  type WebVitalName,
  VITAL_NAMES,
  clearPerformanceData,
  getVitalsSummary,
} from "@/lib/performance";

type Range = "24h" | "7d" | "30d" | "all";

const RANGES: { id: Range; label: string; days?: number }[] = [
  { id: "24h", label: "Last 24h", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "30d", label: "30 days", days: 30 },
  { id: "all", label: "All time", days: undefined },
];

const VITAL_INFO: Record<
  WebVitalName,
  { unit: "ms" | "score"; description: string }
> = {
  LCP: {
    unit: "ms",
    description:
      "Largest Contentful Paint: when the main content of the page becomes visible.",
  },
  INP: {
    unit: "ms",
    description:
      "Interaction to Next Paint: how quickly the page responds to interactions.",
  },
  CLS: {
    unit: "score",
    description:
      "Cumulative Layout Shift: how much the page unexpectedly shifts while loading.",
  },
  FCP: {
    unit: "ms",
    description:
      "First Contentful Paint: when the first content appears on screen.",
  },
  TTFB: {
    unit: "ms",
    description:
      "Time to First Byte: how long the server takes to start responding.",
  },
  FID: {
    unit: "ms",
    description:
      "First Input Delay: the delay before the page reacts to the first interaction.",
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

export default function PerformanceClient() {
  const [range, setRange] = useState<Range>("7d");
  const [vitals, setVitals] = useState<Record<string, VitalSummary>>({});
  const [reloadKey, setReloadKey] = useState(0);

  const days = useMemo(
    () => RANGES.find((r) => r.id === range)?.days,
    [range],
  );

  useEffect(() => {
    setVitals(getVitalsSummary(days));
  }, [days, reloadKey]);

  const clearAll = () => {
    clearPerformanceData();
    setReloadKey((k) => k + 1);
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
        <Link
          href="/docs/performance"
          className="text-foreground/60 hover:text-foreground"
        >
          Docs
        </Link>
        <span className="text-foreground font-medium">Performance</span>
      </div>

      <div className="mb-2 flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl">Performance</h1>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm hover:border-foreground/40 transition"
        >
          Clear data
        </button>
      </div>
      <p className="text-foreground/70 mb-6">
        Web Vitals, page load, and API timings measured in your browser. Stored
        locally; nothing is sent anywhere.
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

      <h2 className="mb-3 text-sm uppercase tracking-wide text-foreground/50">
        Web Vitals
      </h2>
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {VITAL_NAMES.map((name) => {
          const summary = vitals[name];
          const info = VITAL_INFO[name];
          return (
            <div
              key={name}
              className="rounded-lg border border-foreground/10 bg-card p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-foreground/70">
                  {name}
                </span>
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
              <div className="mt-2 font-mono text-2xl">
                {summary ? formatVital(summary.p75, info.unit) : "n/a"}
              </div>
              <p className="mt-2 text-xs text-foreground/55">
                {info.description}
              </p>
              <p className="mt-1 text-[10px] text-foreground/40">
                {summary
                  ? `p75 of ${summary.count} sample${summary.count === 1 ? "" : "s"}`
                  : "No data yet"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
