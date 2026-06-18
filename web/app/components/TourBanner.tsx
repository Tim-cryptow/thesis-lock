"use client";

import { useEffect, useState } from "react";
import { useTour } from "./TourProvider";
import { resetTour, shouldShowTour } from "@/lib/onboarding";

// Landing-page entry point to the onboarding tour. First-time visitors get a
// prominent banner; returning visitors get a subtle "Take a tour" link. The
// first-time check reads localStorage, so it runs after mount to avoid a
// hydration mismatch.
export default function TourBanner() {
  const { startTour } = useTour();
  const [mounted, setMounted] = useState(false);
  const [firstTime, setFirstTime] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFirstTime(shouldShowTour());
  }, []);

  if (!mounted) return null;

  if (firstTime) {
    return (
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-foreground/10 bg-card px-6 py-4">
        <p className="text-sm text-foreground/80">
          New here? Take a quick tour of the key features.
        </p>
        <button
          type="button"
          onClick={startTour}
          className="inline-flex items-center rounded-md bg-heading px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          Start tour
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        resetTour();
        startTour();
      }}
      className="mt-8 text-sm text-foreground/50 underline-offset-4 transition hover:text-foreground hover:underline"
    >
      Take a tour
    </button>
  );
}
