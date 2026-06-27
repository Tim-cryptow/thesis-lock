"use client";

import { useEffect, useState } from "react";

const DEBUG_KEY = "thesislock_perf_debug";
// Same-tab toggle signal (the storage event only fires in other tabs).
export const PERF_DEBUG_EVENT = "thesislock:perf-debug-changed";

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

type NavTiming = PerformanceNavigationTiming & { activationStart?: number };

export function isPerfDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPerfDebugEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEBUG_KEY, enabled ? "1" : "0");
    window.dispatchEvent(new CustomEvent(PERF_DEBUG_EVENT));
  } catch {
    // ignore
  }
}

// Small, semi-transparent overlay that shows live LCP, CLS, and page load time
// for the current page. Off by default; toggled from the performance page. It is
// non-interactive so it never blocks the content underneath.
export default function PerformanceBanner() {
  const [enabled, setEnabled] = useState(false);
  const [lcp, setLcp] = useState<number | null>(null);
  const [cls, setCls] = useState(0);
  const [load, setLoad] = useState<number | null>(null);

  useEffect(() => {
    setEnabled(isPerfDebugEnabled());
    const sync = () => setEnabled(isPerfDebugEnabled());
    window.addEventListener("storage", sync);
    window.addEventListener(PERF_DEBUG_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(PERF_DEBUG_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (!enabled || typeof PerformanceObserver === "undefined") return;
    const observers: PerformanceObserver[] = [];

    try {
      const po = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) setLcp(last.startTime);
      });
      po.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(po);
    } catch {
      // unsupported
    }

    try {
      const po = new PerformanceObserver((list) => {
        let added = 0;
        for (const entry of list.getEntries() as LayoutShiftEntry[]) {
          if (!entry.hadRecentInput) added += entry.value;
        }
        if (added > 0) setCls((c) => c + added);
      });
      po.observe({ type: "layout-shift", buffered: true });
      observers.push(po);
    } catch {
      // unsupported
    }

    try {
      const nav = performance.getEntriesByType("navigation")[0] as NavTiming | undefined;
      if (nav) {
        setLoad(Math.max(0, nav.loadEventEnd - (nav.activationStart ?? 0)));
      }
    } catch {
      // unsupported
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed bottom-2 left-2 z-40 rounded bg-black/70 px-2 py-1 font-mono text-[10px] leading-tight text-white/90 shadow">
      <span>LCP {lcp === null ? "n/a" : `${Math.round(lcp)}ms`}</span>
      <span className="mx-1.5 text-white/30">|</span>
      <span>CLS {cls.toFixed(3)}</span>
      <span className="mx-1.5 text-white/30">|</span>
      <span>Load {load === null ? "n/a" : `${Math.round(load)}ms`}</span>
    </div>
  );
}
