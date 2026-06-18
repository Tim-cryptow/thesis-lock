"use client";

import { useCallback, useEffect, useState } from "react";
import type { TourStep } from "@/lib/onboarding";

// Gap in pixels between the highlighted element and the tooltip.
const GAP = 14;

export type TourOverlayProps = {
  step: TourStep;
  index: number;
  total: number;
  // True when the step belongs to a different route than the one in view.
  needsNavigation: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onGoToPage: (page: string) => void;
};

// Friendly label for the "Go to ..." button derived from a route path.
function pageLabel(path: string): string {
  if (path === "/") return "home";
  const seg = path.replace(/^\//, "").split("/")[0];
  return seg.replace(/-/g, " ");
}

// Locates the step target and returns its viewport rect, retrying briefly so a
// freshly navigated page has time to mount the element. Returns null for steps
// with no target or when the element never appears (handled as a centered card).
function useTargetRect(step: TourStep): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    if (!step.target) {
      setRect(null);
      return false;
    }
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return false;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setRect(el.getBoundingClientRect());
    return true;
  }, [step.target]);

  useEffect(() => {
    if (!step.target) {
      setRect(null);
      return;
    }
    let cancelled = false;

    // A MutationObserver keeps watching for the target so it is spotlighted even
    // when it mounts after the timed retries below, for example when the tour
    // navigates to a route whose content arrives through a client-only dynamic
    // import. It disconnects as soon as the target is found.
    const observer = new MutationObserver(() => {
      if (!cancelled && measure()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Retry a few times up front: the target may mount after a route change or a
    // smooth scroll may still be settling, and a found target lets us stop
    // observing immediately.
    const timers: ReturnType<typeof setTimeout>[] = [];
    [0, 80, 200, 400, 700].forEach((delay) => {
      timers.push(
        setTimeout(() => {
          if (!cancelled && measure()) observer.disconnect();
        }, delay),
      );
    });
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancelled = true;
      observer.disconnect();
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [step.target, measure]);

  return rect;
}

// Inline position styles for the tooltip relative to the highlighted rect.
function tooltipStyle(
  rect: DOMRect | null,
  position: TourStep["position"],
): React.CSSProperties {
  if (!rect) {
    return {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  }
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  switch (position) {
    case "top":
      return { top: rect.top - GAP, left: cx, transform: "translate(-50%, -100%)" };
    case "left":
      return { top: cy, left: rect.left - GAP, transform: "translate(-100%, -50%)" };
    case "right":
      return { top: cy, left: rect.right + GAP, transform: "translate(0, -50%)" };
    case "bottom":
    default:
      return { top: rect.bottom + GAP, left: cx, transform: "translate(-50%, 0)" };
  }
}

export default function TourOverlay({
  step,
  index,
  total,
  needsNavigation,
  onNext,
  onPrev,
  onSkip,
  onGoToPage,
}: TourOverlayProps) {
  // When the step lives on another page we never try to spotlight; show a
  // centered card with a "Go to ..." button instead.
  const rect = useTargetRect(needsNavigation ? { ...step, target: "" } : step);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const spotlight = rect && !needsNavigation;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={step.title}>
      {/* Dimming layer. With a target we punch a spotlight with a large box
          shadow; without one we dim the whole screen. Clicking the backdrop
          does nothing so a stray click cannot skip the tour. */}
      {spotlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-lg ring-2 ring-background transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-black/60" />
      )}

      <div
        className="absolute z-[61] w-[20rem] max-w-[calc(100vw-2rem)] rounded-lg border border-foreground/15 bg-card p-5 shadow-xl transition-all duration-300"
        style={tooltipStyle(spotlight ? rect : null, step.position)}
      >
        <p className="mb-1 font-mono text-xs text-foreground/50">
          {index + 1} of {total}
        </p>
        <h2 className="mb-2 text-lg font-semibold text-heading">{step.title}</h2>
        <p className="text-sm leading-relaxed text-foreground/70">{step.content}</p>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-foreground/50 hover:text-foreground transition"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={onPrev}
                className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm text-foreground/70 hover:border-foreground/40 hover:text-foreground transition"
              >
                Back
              </button>
            )}
            {needsNavigation && step.page ? (
              <button
                type="button"
                onClick={() => onGoToPage(step.page as string)}
                className="rounded-md bg-heading px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 transition"
              >
                Go to {pageLabel(step.page)}
              </button>
            ) : (
              <button
                type="button"
                onClick={onNext}
                className="rounded-md bg-heading px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 transition"
              >
                {isLast ? "Finish" : "Next"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
