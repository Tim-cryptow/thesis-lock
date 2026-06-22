import { SkeletonLine } from "@/app/components/Skeleton";

// Placeholder for the feed (and search results) while loading. Each row mirrors
// a feed entry: a timestamp, a hash, a label, and an owner/block line.
export default function FeedSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-foreground/10 bg-card p-5 space-y-2.5"
        >
          <SkeletonLine width="5rem" height="0.65rem" />
          <SkeletonLine width="60%" height="0.9rem" />
          <SkeletonLine width="80%" height="0.8rem" />
          <SkeletonLine width="40%" height="0.7rem" />
        </div>
      ))}
    </div>
  );
}
