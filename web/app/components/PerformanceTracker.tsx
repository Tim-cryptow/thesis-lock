"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  PERF_FLUSH_EVENT,
  ratingFor,
  recordPageMetric,
  recordVital,
  type WebVitalName,
} from "@/lib/performance";

// layout-shift entries are not in the standard TS DOM lib.
interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

type NavTiming = PerformanceNavigationTiming & { activationStart?: number };

// Invisible component, mounted once in the layout. Captures Web Vitals with
// PerformanceObserver and page timings from the Navigation Timing API, recording
// everything locally. It deliberately does not touch fetch: API timing is
// recorded by the instrumented fetch wrapper instead, so nothing is double
// counted and window.fetch is never monkey-patched.
export default function PerformanceTracker() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  // Web Vitals: set up observers once. FCP, TTFB, and FID report as soon as they
  // are known; LCP, CLS, and INP accumulate and are flushed when the page is
  // hidden, on unmount, or on demand when the dashboard opens (a reasonable
  // approximation of the official algorithm).
  useEffect(() => {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
      return;
    }

    const currentPath = () => pathRef.current || window.location.pathname || "/";
    const report = (name: WebVitalName, value: number) => {
      recordVital({
        name,
        value,
        rating: ratingFor(name, value),
        timestamp: new Date().toISOString(),
        path: currentPath(),
      });
    };

    const observers: PerformanceObserver[] = [];
    const observe = (
      cb: (list: PerformanceObserverEntryList) => void,
      init: PerformanceObserverInit,
    ) => {
      try {
        const po = new PerformanceObserver(cb);
        po.observe(init);
        observers.push(po);
      } catch {
        // Entry type unsupported in this browser; skip it.
      }
    };

    try {
      const nav = performance.getEntriesByType("navigation")[0] as NavTiming | undefined;
      if (nav) {
        report("TTFB", Math.max(0, nav.responseStart - (nav.activationStart ?? 0)));
      }
    } catch {
      // navigation timing unavailable; skip TTFB.
    }

    observe(
      (list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") report("FCP", entry.startTime);
        }
      },
      { type: "paint", buffered: true },
    );

    let lcp = 0;
    observe(
      (list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) lcp = last.startTime;
      },
      { type: "largest-contentful-paint", buffered: true },
    );

    // CLS is the largest "session window" of layout shifts, not the lifetime
    // sum: shifts within 1s of each other and 5s of the window start belong to
    // the same window, and CLS is the worst such window. Summing every shift
    // would over-rate long-lived SPA sessions.
    let cls = 0;
    let clsWindow = 0;
    let clsFirst = 0;
    let clsPrev = 0;
    observe(
      (list) => {
        for (const entry of list.getEntries() as LayoutShiftEntry[]) {
          if (entry.hadRecentInput) continue;
          if (
            clsWindow !== 0 &&
            entry.startTime - clsPrev < 1000 &&
            entry.startTime - clsFirst < 5000
          ) {
            clsWindow += entry.value;
          } else {
            clsWindow = entry.value;
            clsFirst = entry.startTime;
          }
          clsPrev = entry.startTime;
          if (clsWindow > cls) cls = clsWindow;
        }
      },
      { type: "layout-shift", buffered: true },
    );

    observe(
      (list) => {
        const entry = list.getEntries()[0] as PerformanceEventTiming | undefined;
        if (entry) report("FID", entry.processingStart - entry.startTime);
      },
      { type: "first-input", buffered: true },
    );

    let inp = 0;
    observe(
      (list) => {
        for (const entry of list.getEntries() as PerformanceEventTiming[]) {
          if (entry.duration > inp) inp = entry.duration;
        }
      },
      { type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit,
    );

    // LCP, CLS, and INP are not known to be final until the page is hidden, but
    // this tracker never unmounts on SPA navigation, so a snapshot is also
    // flushed on demand when the dashboard opens. Each value is recorded only
    // when it changed since the last flush, so repeated flushes (open the
    // dashboard, hide the tab, reopen) never duplicate samples.
    let recordedLcp = -1;
    let recordedCls = -1;
    let recordedInp = -1;
    const snapshot = () => {
      if (lcp > 0 && lcp !== recordedLcp) {
        report("LCP", lcp);
        recordedLcp = lcp;
      }
      if (cls !== recordedCls) {
        report("CLS", cls);
        recordedCls = cls;
      }
      if (inp > 0 && inp !== recordedInp) {
        report("INP", inp);
        recordedInp = inp;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") snapshot();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", snapshot);
    window.addEventListener(PERF_FLUSH_EVENT, snapshot);

    return () => {
      observers.forEach((o) => o.disconnect());
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", snapshot);
      window.removeEventListener(PERF_FLUSH_EVENT, snapshot);
      snapshot();
    };
  }, []);

  // Page metrics: full navigation timing on first load, an approximate render
  // time on each client-side route change (SPA navigations have no new
  // navigation entry).
  const initialDoneRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!initialDoneRef.current) {
      initialDoneRef.current = true;
      const record = () => {
        try {
          const nav = performance.getEntriesByType("navigation")[0] as NavTiming | undefined;
          const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
          const base = nav?.activationStart ?? 0;
          const transferSize =
            (nav?.transferSize ?? 0) + resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
          recordPageMetric({
            path: pathRef.current,
            loadTime: nav ? Math.max(0, nav.loadEventEnd - base) : 0,
            renderTime: nav ? Math.max(0, nav.domContentLoadedEventEnd - base) : 0,
            timestamp: new Date().toISOString(),
            resourceCount: resources.length,
            transferSize,
          });
        } catch {
          // navigation timing unavailable; skip.
        }
      };
      if (document.readyState === "complete") {
        // The load event has already fired, so loadEventEnd is populated.
        record();
        return;
      }
      // loadEventEnd is only set after the load event handler finishes, so
      // reading it from inside the load listener yields 0. Defer by one task so
      // a normal first page view does not store a 0 ms load time.
      let timer: number | undefined;
      const onLoad = () => {
        timer = window.setTimeout(record, 0);
      };
      window.addEventListener("load", onLoad, { once: true });
      return () => {
        window.removeEventListener("load", onLoad);
        if (timer !== undefined) window.clearTimeout(timer);
      };
    }

    const start = performance.now();
    const raf = requestAnimationFrame(() => {
      const renderTime = Math.max(0, performance.now() - start);
      recordPageMetric({
        path: pathname,
        loadTime: renderTime,
        renderTime,
        timestamp: new Date().toISOString(),
        resourceCount: 0,
        transferSize: 0,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
