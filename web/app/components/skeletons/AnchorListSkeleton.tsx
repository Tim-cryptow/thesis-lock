import { SkeletonBlock, SkeletonLine } from "@/app/components/Skeleton";

// Placeholder for the My Anchors list while it loads. Each row mirrors an
// anchor card: a hash line, a label line, a block number, and action buttons.
export default function AnchorListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-lg border border-foreground/10 bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2.5">
              <SkeletonLine width="9rem" height="0.7rem" />
              <SkeletonLine width="70%" height="0.9rem" />
              <SkeletonLine width="45%" height="0.8rem" />
              <SkeletonLine width="6rem" height="0.7rem" />
            </div>
            <div className="flex shrink-0 gap-2">
              <SkeletonBlock width="5rem" height="2.25rem" />
              <SkeletonBlock width="5rem" height="2.25rem" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
