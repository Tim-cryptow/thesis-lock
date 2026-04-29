"use client";

import dynamic from "next/dynamic";

const AnchorClient = dynamic(() => import("./AnchorClient"), { ssr: false });

export default function Page() {
  return <AnchorClient />;
}
