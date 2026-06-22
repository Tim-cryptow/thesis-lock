import { SkeletonLine } from "@/app/components/Skeleton";

// Placeholder for a row of stat cards. Each card mirrors a metric: a small
// label above a larger number.
export default function StatsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-foreground/10 bg-card p-6"
        >
          <SkeletonLine width="5rem" height="0.7rem" className="mb-3" />
          <SkeletonLine width="6rem" height="1.75rem" />
        </div>
      ))}
    </div>
  );
}
