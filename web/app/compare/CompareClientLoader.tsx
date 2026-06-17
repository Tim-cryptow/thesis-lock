"use client";

import dynamic from "next/dynamic";

const CompareClient = dynamic(() => import("./CompareClient"), { ssr: false });

export default function CompareClientLoader() {
  return <CompareClient />;
}
