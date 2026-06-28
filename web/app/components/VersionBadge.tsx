import Link from "next/link";
import { APP_VERSION } from "@/lib/version";

type VersionBadgeProps = { className?: string };

// Small version chip that links to the changelog. Subtle enough for a footer or
// an about section.
export default function VersionBadge({ className = "" }: VersionBadgeProps) {
  return (
    <Link
      href="/changelog"
      title="View the changelog"
      className={`inline-flex items-center rounded-full border border-foreground/15 px-2 py-0.5 font-mono text-xs text-foreground/60 transition hover:border-foreground/30 hover:text-foreground ${className}`}
    >
      v{APP_VERSION}
    </Link>
  );
}
