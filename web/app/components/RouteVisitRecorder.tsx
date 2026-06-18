"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordVisit } from "@/lib/commandPalette";

// Records each visited route so the command palette can surface a Recent
// section. Renders nothing.
export default function RouteVisitRecorder() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) recordVisit(pathname);
  }, [pathname]);
  return null;
}
