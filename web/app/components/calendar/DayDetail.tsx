"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AddToCollectionButton from "@/app/components/AddToCollectionButton";
import { getTemplate, parseLabel } from "@/lib/templates";
import { getTagsForHash } from "@/lib/tags";
import { stageReportInput } from "@/lib/reportLink";
import type { CalendarDay, CalendarHash } from "@/lib/calendar";

// An expandable panel listing every anchor on a selected day, shared by both the
// contribution graph and the monthly calendar.

const SOURCE_BADGE: Record<string, string> = {
  single: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  batch: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  registry: "bg-foreground/10 text-foreground/60",
  group: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  proof: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
};

const SOURCE_LABEL: Record<string, string> = {
  single: "Single",
  batch: "Batch",
  registry: "Registry",
  group: "Group",
  proof: "Proof",
};

function truncateHash(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : hash;
}

function formatLong(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard may be unavailable; ignore.
        }
      }}
      title="Copy hash"
      aria-label="Copy hash"
      className="text-xs text-foreground/60 hover:text-foreground transition"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function AnchorRow({
  item,
  owner,
}: {
  item: CalendarHash;
  owner?: string | null;
}) {
  const parsed = parseLabel(item.label);
  const template = parsed.templateId ? getTemplate(parsed.templateId) : undefined;
  const tags = getTagsForHash(item.hash);
  // A bare /v/<hash> link can resolve to an unrelated record when the same hash
  // exists in more than one place. A batch record is keyed by { hash, owner },
  // and a group anchor by { group, index }, so scope those rows to the exact
  // record they came from.
  const verifyHref =
    item.source === "batch" && owner
      ? `/v/${item.hash}?owner=${owner}`
      : item.source === "group" &&
          item.groupId !== undefined &&
          item.groupIndex !== undefined
        ? `/v/${item.hash}?group=${item.groupId}&gi=${item.groupIndex}`
        : `/v/${item.hash}`;
  return (
    <li className="rounded-md border border-foreground/10 p-3">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
            SOURCE_BADGE[item.source] ?? SOURCE_BADGE.registry
          }`}
        >
          {SOURCE_LABEL[item.source] ?? item.source}
        </span>
        {template ? (
          <span className="inline-flex items-center rounded-full bg-foreground/5 px-2 py-0.5 text-[11px] text-foreground/60">
            {template.name}
          </span>
        ) : null}
        {item.label ? (
          <span className="text-sm text-foreground/80 truncate">{item.label}</span>
        ) : (
          <span className="text-sm text-foreground/40">No label</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={verifyHref}
          className="font-mono text-xs text-foreground/70 hover:text-foreground hover:underline break-all"
        >
          {truncateHash(item.hash)}
        </Link>
        <CopyButton value={item.hash} />
        <Link
          href={verifyHref}
          className="text-xs text-foreground/60 hover:text-foreground hover:underline"
        >
          Verify
        </Link>
        <AddToCollectionButton
          hash={item.hash}
          label={item.label}
          verifyUrl={verifyHref}
        />
      </div>
      {tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-foreground/5 px-2 py-0.5 text-[11px] text-foreground/60"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </li>
  );
}

export default function DayDetail({
  day,
  onClose,
  owner,
}: {
  day: CalendarDay | null;
  onClose: () => void;
  owner?: string | null;
}) {
  const [shown, setShown] = useState(false);

  // Replay the entrance transition whenever a different day is opened.
  useEffect(() => {
    setShown(false);
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [day?.date]);

  if (!day) return null;

  const { hashes } = day;
  return (
    <div
      className={`mt-6 rounded-lg border border-foreground/10 bg-card p-5 transition-all duration-200 ${
        shown ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{formatLong(day.date)}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day detail"
          className="text-sm text-foreground/50 hover:text-foreground transition"
        >
          Close
        </button>
      </div>

      {hashes.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-foreground/60 mb-4">No anchors on this day.</p>
          <Link
            href="/anchor"
            className="inline-block px-4 py-2 rounded-md bg-heading text-background text-sm font-medium hover:opacity-90"
          >
            Anchor a document
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {hashes.map((item, i) => (
              <AnchorRow key={`${item.hash}-${i}`} item={item} owner={owner} />
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/report"
              onClick={() =>
                stageReportInput(hashes.map((h) => ({ hash: h.hash })))
              }
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              Generate report for this day
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
