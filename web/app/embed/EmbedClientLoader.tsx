"use client";

import dynamic from "next/dynamic";

const EmbedClient = dynamic(() => import("./EmbedClient"), { ssr: false });

export default function EmbedClientLoader() {
  return <EmbedClient />;
}
