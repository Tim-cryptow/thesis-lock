"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDoc } from "@/lib/docs";

type BreadcrumbsProps = {
  // Custom labels keyed by the raw path segment. Used for dynamic segments such
  // as a group id or collection id whose readable name is only known at render
  // time, for example { "7": "Research Team" } on /groups/7.
  overrides?: Record<string, string>;
};

// Readable labels for known route segments. Anything not listed is humanized
// from the segment itself.
const SEGMENT_LABELS: Record<string, string> = {
  v: "Verify",
  u: "Profile",
  groups: "Groups",
  collections: "Collections",
  docs: "Docs",
  anchor: "Anchor",
  anchors: "My Anchors",
  feed: "Feed",
  stats: "Stats",
  search: "Search",
  dashboard: "Dashboard",
  settings: "Settings",
  activity: "Activity",
  compare: "Compare",
  report: "Report",
  explorer: "Explorer",
  watchlist: "Watchlist",
  collection: "Collection",
  tags: "Tags",
  calendar: "Calendar",
  templates: "Templates",
  notifications: "Notifications",
  developers: "Developers",
  glossary: "Glossary",
  performance: "Performance",
  audit: "Audit",
  status: "Status",
  "verify-bulk": "Bulk Verify",
};

// Intermediate segments whose route is purely dynamic and has no index page, so
// a crumb for them must be plain text rather than a link that would 404.
const NO_INDEX_SEGMENTS = new Set(["v", "u"]);

// A 64-character hex string is a document hash; a long upper-case string
// starting with S is a Stacks principal. Both are truncated to stay compact.
function isHash(segment: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(segment);
}

function isPrincipal(segment: string): boolean {
  return /^S[0-9A-Z]{38,}$/.test(segment);
}

function truncateMiddle(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function humanize(segment: string): string {
  return segment
    .split("-")
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function labelFor(
  segment: string,
  index: number,
  segments: string[],
  overrides: Record<string, string>,
): string {
  if (overrides[segment]) return overrides[segment];
  // A docs slug reads best as its documented title.
  if (index > 0 && segments[index - 1] === "docs") {
    const doc = getDoc(segment);
    if (doc) return doc.title;
  }
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (isHash(segment) || isPrincipal(segment)) return truncateMiddle(segment);
  if (segment.length > 24) return truncateMiddle(segment);
  return humanize(segment);
}

// A concise, human title for a path, reused by navigation tracking so the
// breadcrumb labels and the recent-pages list stay consistent. A dynamic
// trailing segment is named after its section instead of a raw id.
export function titleForPath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Home";
  const last = segments[segments.length - 1]!;
  if (isHash(last) || isPrincipal(last) || /^\d+$/.test(last)) {
    const parent = segments[segments.length - 2];
    if (parent && SEGMENT_LABELS[parent]) return SEGMENT_LABELS[parent];
  }
  if (segments.length >= 2 && segments[segments.length - 2] === "docs") {
    const doc = getDoc(last);
    if (doc) return doc.title;
  }
  if (SEGMENT_LABELS[last]) return SEGMENT_LABELS[last];
  if (isHash(last) || isPrincipal(last)) return truncateMiddle(last);
  return humanize(last);
}

export default function Breadcrumbs({ overrides = {} }: BreadcrumbsProps) {
  const pathname = usePathname() || "/";
  const segments = pathname.split("/").filter(Boolean);

  // The landing page is the root of the trail, so there is nothing to show.
  if (segments.length === 0) return null;

  const crumbs = [
    { label: "Home", href: "/", segment: "" },
    ...segments.map((segment, index) => ({
      label: labelFor(segment, index, segments, overrides),
      href: "/" + segments.slice(0, index + 1).join("/"),
      segment,
    })),
  ];

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-xs text-foreground/50">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const linkable = !isLast && !NO_INDEX_SEGMENTS.has(crumb.segment);
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden="true" className="text-foreground/30">
                  /
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="text-foreground/80">
                  {crumb.label}
                </span>
              ) : linkable ? (
                <Link href={crumb.href} className="hover:text-foreground transition">
                  {crumb.label}
                </Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
