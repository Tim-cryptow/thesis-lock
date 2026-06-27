import { SkeletonLine } from "@/app/components/Skeleton";

// Placeholder for the verify page while the on-chain lookup is in flight. The
// hash itself is already shown from the URL, so this covers the parts that are
// loading: the status line and the record detail rows (label, owner, block).
export default function VerifySkeleton() {
  const widths = ["55%", "70%", "30%"];
  return (
    <div className="mt-4 pt-4 border-t border-foreground/10 space-y-5" aria-busy="true">
      <SkeletonLine width="10rem" height="1rem" />
      {widths.map((width, i) => (
        <div key={i} className="space-y-2">
          <SkeletonLine width="5rem" height="0.65rem" />
          <SkeletonLine width={width} height="0.9rem" />
        </div>
      ))}
    </div>
  );
}
