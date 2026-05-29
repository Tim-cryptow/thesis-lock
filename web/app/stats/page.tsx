"use client";

import dynamic from "next/dynamic";

const StatsClient = dynamic(() => import("./StatsClient"), { ssr: false });

export default function Page() {
  return <StatsClient />;
}
