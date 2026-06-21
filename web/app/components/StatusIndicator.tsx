import type { ServiceStatusLevel } from "@/lib/statusMonitor";

// A small colored dot with optional status text, shared by the status page and
// the footer. Pure and presentational, so it can render in either a server or a
// client tree. A degraded status pulses to draw the eye to a partial problem.

const COLORS: Record<string, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
  unknown: "bg-foreground/30",
};

const LABELS: Record<string, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
  unknown: "Unknown",
};

const SIZES: Record<"sm" | "md" | "lg", string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3.5 w-3.5",
};

export default function StatusIndicator({
  status,
  size = "md",
  showText = true,
  label,
}: {
  status: ServiceStatusLevel | string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  label?: string;
}) {
  const dot = COLORS[status] ?? COLORS.unknown;
  const text = label ?? LABELS[status] ?? "Unknown";
  const dim = SIZES[size];
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`relative inline-flex ${dim}`}>
        {status === "degraded" ? (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${dot} opacity-60 animate-ping`}
          />
        ) : null}
        <span className={`relative inline-flex rounded-full ${dim} ${dot}`} />
      </span>
      {showText ? <span className="text-sm">{text}</span> : null}
    </span>
  );
}
