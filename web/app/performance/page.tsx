"use client";

import dynamic from "next/dynamic";

// Client-only: the dashboard reads performance metrics from localStorage.
const PerformanceClient = dynamic(() => import("./PerformanceClient"), {
  ssr: false,
});

export default function Page() {
  return <PerformanceClient />;
}
