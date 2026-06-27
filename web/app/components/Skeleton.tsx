// Base skeleton primitives. Each renders a theme-aware shimmer (see the
// .skeleton class in globals.css) and is purely decorative, so it is hidden
// from assistive technology; the containing region carries aria-busy instead.

type LineProps = {
  width?: string;
  height?: string;
  className?: string;
};

export function SkeletonLine({ width = "100%", height = "1rem", className = "" }: LineProps) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block rounded ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonCircle({
  size = "2.5rem",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block rounded-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonBlock({ width = "100%", height = "100%", className = "" }: LineProps) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton block rounded-lg ${className}`}
      style={{ width, height }}
    />
  );
}
