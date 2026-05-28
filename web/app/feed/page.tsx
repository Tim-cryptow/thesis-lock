"use client";

import dynamic from "next/dynamic";

const FeedClient = dynamic(() => import("./FeedClient"), { ssr: false });

export default function Page() {
  return <FeedClient />;
}
