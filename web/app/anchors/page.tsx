"use client";

import dynamic from "next/dynamic";

const AnchorsClient = dynamic(() => import("./AnchorsClient"), { ssr: false });

export default function Page() {
  return <AnchorsClient />;
}
