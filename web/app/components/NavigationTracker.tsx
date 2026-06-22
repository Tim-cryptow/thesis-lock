"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordPageVisit } from "@/lib/navigationHistory";
import { titleForPath } from "@/app/components/Breadcrumbs";

// Records each visited route into the session navigation history that powers the
// back button and the recent-pages dropdown. The per-route document title is
// preferred, falling back to a label derived from the path for client-only
// pages that do not export metadata. Renders nothing.
export default function NavigationTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    // Let the route's metadata-driven document.title settle before reading it.
    const id = window.setTimeout(() => {
      const raw = document.title || "";
      const stripped = raw.replace(/\s*\|\s*ThesisLock.*$/i, "").trim();
      const fallback = titleForPath(pathname);
      const usable = stripped.length > 0 && !/^ThesisLock\b/i.test(raw);
      recordPageVisit(pathname, usable ? stripped : fallback);
    }, 80);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
