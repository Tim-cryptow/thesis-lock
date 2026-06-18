"use client";

import dynamic from "next/dynamic";

const DeveloperPortal = dynamic(() => import("./DeveloperPortal"), {
  ssr: false,
});

export default function DevelopersClientLoader() {
  return <DeveloperPortal />;
}
