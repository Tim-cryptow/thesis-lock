"use client";

import { useLive } from "@/app/components/LiveProvider";

type Props = {
  // Hide the text label and show just the dot (useful in tight nav rows).
  showText?: boolean;
  className?: string;
};

// A small status dot reflecting the live polling connection. Green and pulsing
// when live, red when polling has errored, gray when paused. Clicking it
// toggles pause/resume.
export default function LiveBadge({ showText = true, className = "" }: Props) {
  const { status, toggle } = useLive();

  const dotClass =
    status === "live"
      ? "bg-emerald-500 live-dot-pulse"
      : status === "error"
        ? "bg-red-500"
        : "bg-foreground/40";

  const label = status === "live" ? "Live" : status === "error" ? "Reconnecting" : "Paused";

  const title =
    status === "paused"
      ? "Live updates are paused. Click to resume."
      : status === "error"
        ? "Live updates hit a network error and will retry. Click to pause."
        : "Live updates are on. Click to pause.";

  return (
    <button
      type="button"
      onClick={toggle}
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition ${className}`}
    >
      <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
      {showText && <span>{label}</span>}
    </button>
  );
}
