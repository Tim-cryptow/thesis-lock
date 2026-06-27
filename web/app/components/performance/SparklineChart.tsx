import { type Rating } from "@/lib/performance";

function strokeColor(rating: Rating): string {
  if (rating === "good") return "#10b981";
  if (rating === "needs-improvement") return "#f59e0b";
  return "#ef4444";
}

// Tiny inline SVG line chart of recent values, colored by the metric's rating.
// Purely decorative, so it is hidden from assistive tech.
export function SparklineChart({
  values,
  rating,
  width = 80,
  height = 24,
}: {
  values: number[];
  rating: Rating;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const stepX = innerW / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + innerH - ((v - min) / span) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        fill="none"
        stroke={strokeColor(rating)}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
