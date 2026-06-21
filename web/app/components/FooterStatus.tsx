"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StatusIndicator from "@/app/components/StatusIndicator";
import type { OverallStatus, ServiceStatusLevel } from "@/lib/statusMonitor";

// A compact, link-wrapped status dot for the footer on every page. It reads the
// server-side snapshot from /api/status (briefly cached at the edge) and caches
// the result per session so navigating does not refetch on every page.

const CACHE_KEY = "thesislock_status_overall";
const TTL_MS = 60_000;

const LEVEL: Record<OverallStatus, ServiceStatusLevel> = {
  "all-operational": "operational",
  "partial-outage": "degraded",
  "major-outage": "down",
};

export default function FooterStatus() {
  const [overall, setOverall] = useState<OverallStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Show any fresh cached value instantly and skip the fetch if it is recent.
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { value: OverallStatus; at: number };
        if (cached && typeof cached.at === "number") {
          setOverall(cached.value);
          if (Date.now() - cached.at < TTL_MS) return;
        }
      }
    } catch {
      // Ignore a malformed cache entry and fetch fresh.
    }

    (async () => {
      try {
        const res = await fetch("/api/status");
        if (!res.ok) return;
        const data = (await res.json()) as { overall?: OverallStatus };
        if (cancelled || !data.overall) return;
        setOverall(data.overall);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ value: data.overall, at: Date.now() }),
          );
        } catch {
          // Non-fatal if sessionStorage is unavailable.
        }
      } catch {
        // Leave the indicator neutral on any failure.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const level: ServiceStatusLevel = overall ? LEVEL[overall] : "unknown";
  const text =
    overall === "all-operational"
      ? "All systems operational"
      : overall == null
        ? "System status"
        : "System issues";

  return (
    <Link
      href="/status"
      title="System status"
      className="inline-flex items-center gap-2 hover:text-foreground transition"
    >
      <StatusIndicator status={level} size="sm" showText={false} />
      <span>{text}</span>
    </Link>
  );
}
