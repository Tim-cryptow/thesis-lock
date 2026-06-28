"use client";

import { useState } from "react";
import { APP_VERSION, RELEASES, type ChangeType } from "@/lib/version";

// Color-coded badges for each conventional-commit change type.
const TYPE_STYLES: Record<ChangeType, string> = {
  feat: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  fix: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  docs: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  chore: "bg-foreground/10 text-foreground/60",
  test: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Formats an ISO calendar date deterministically, so the server and client
// render the same string regardless of locale or time zone.
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const name = month ? MONTHS[month - 1] : undefined;
  if (!year || !name || !day) return iso;
  return `${name} ${day}, ${year}`;
}

export default function ChangelogClient() {
  const [openVersions, setOpenVersions] = useState<Set<string>>(new Set());

  const toggle = (version: string) =>
    setOpenVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl md:text-4xl">Changelog</h1>
      <p className="mt-4 text-lg text-foreground/80 leading-relaxed">
        Every release of ThesisLock, newest first. You are on v{APP_VERSION}.
      </p>

      <div className="mt-10 space-y-8">
        {RELEASES.map((release) => {
          const isCurrent = release.version === APP_VERSION;
          const isOpen = openVersions.has(release.version);
          return (
            <article
              key={release.version}
              className={`rounded-lg border bg-card p-6 ${
                isCurrent ? "border-foreground/30" : "border-foreground/10"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-foreground/20 bg-foreground/5 px-2.5 py-0.5 font-mono text-sm">
                  v{release.version}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-heading px-2.5 py-0.5 text-xs font-medium text-background">
                    Current
                  </span>
                )}
                <time className="text-sm text-foreground/50" dateTime={release.date}>
                  {formatDate(release.date)}
                </time>
              </div>

              <h2 className="mt-3 text-xl">{release.title}</h2>

              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-foreground/80">
                {release.highlights.map((highlight, index) => (
                  <li key={index} className="leading-relaxed">
                    {highlight}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggle(release.version)}
                className="mt-4 text-sm text-foreground/60 underline transition hover:text-foreground"
              >
                {isOpen ? "Hide changes" : `All changes (${release.changes.length})`}
              </button>
              {isOpen && (
                <ul className="mt-3 space-y-2">
                  {release.changes.map((change, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-foreground/80">
                      <span
                        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[0.65rem] font-medium uppercase ${TYPE_STYLES[change.type]}`}
                      >
                        {change.type}
                      </span>
                      <span className="leading-relaxed">{change.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
