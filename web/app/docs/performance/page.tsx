import type { Metadata } from "next";
import Link from "next/link";
import { H2, Lead, List, P } from "../ui";

export const metadata: Metadata = {
  title: { absolute: "Performance Monitoring | ThesisLock Docs" },
  description:
    "How ThesisLock's in-browser performance monitoring works: Web Vitals, page load, and API response metrics, the dashboard, and the debug banner, all stored locally.",
};

export default function PerformanceDocs() {
  return (
    <div>
      <h1 className="text-3xl md:text-4xl">Performance Monitoring</h1>
      <Lead>
        ThesisLock measures its own performance in your browser and shows it on
        the{" "}
        <Link href="/performance" className="underline hover:text-foreground">
          performance dashboard
        </Link>
        . Web Vitals, page load timings, and API response times are captured
        locally and never sent to any analytics service.
      </Lead>

      <H2>What is tracked</H2>
      <List
        items={[
          "Web Vitals: LCP, INP, CLS, FCP, TTFB, and FID, captured with the browser's PerformanceObserver and rated against Google's thresholds.",
          "Page performance: load and render timing per page from the Navigation Timing API, with resource counts and transfer size on first load.",
          "API performance: response time, status, and cache hits for calls to the app's own API routes and the public Hiro API.",
        ]}
      />

      <H2>The dashboard</H2>
      <P>
        The dashboard at{" "}
        <Link href="/performance" className="underline hover:text-foreground">
          /performance
        </Link>{" "}
        shows a card per Web Vital with its p75 value, rating, and a sparkline of
        recent measurements, plus tables of the slowest pages and API endpoints.
        A time range selector covers the last 24 hours, 7 days, 30 days, or all
        time, and a clear button empties the local store.
      </P>

      <H2>Debug banner</H2>
      <P>
        For development, a small overlay can show live LCP, CLS, and page load
        time for the current page. Toggle it with the Enable debug banner button
        on the performance page; it stays off otherwise and never blocks the
        content underneath.
      </P>

      <H2>Privacy</H2>
      <P>
        Everything is stored in your browser in small capped buffers and is
        visible only to you. No performance data leaves the device, and clearing
        it removes it for good.
      </P>
    </div>
  );
}
