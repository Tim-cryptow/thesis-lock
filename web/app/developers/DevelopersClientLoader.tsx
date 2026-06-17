"use client";

import dynamic from "next/dynamic";

const PlaygroundClient = dynamic(() => import("./PlaygroundClient"), {
  ssr: false,
});

export default function DevelopersClientLoader() {
  return <PlaygroundClient />;
}
