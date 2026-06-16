"use client";

import dynamic from "next/dynamic";

const ActivityClient = dynamic(() => import("./ActivityClient"), {
  ssr: false,
});

export default function Page() {
  return <ActivityClient />;
}
