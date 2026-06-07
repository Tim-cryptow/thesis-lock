"use client";

import dynamic from "next/dynamic";

const GroupDetailClient = dynamic(() => import("./GroupDetailClient"), {
  ssr: false,
});

export default function Page() {
  return <GroupDetailClient />;
}
