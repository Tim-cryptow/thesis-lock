"use client";

import dynamic from "next/dynamic";

const ReportClient = dynamic(() => import("./ReportClient"), {
  ssr: false,
});

export default function ReportClientLoader() {
  return <ReportClient />;
}
