"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ContributionGraph from "./ContributionGraph";
import {
  buildRecentDays,
  buildYearGrid,
  getStreakInfo,
  type CalendarDay,
} from "@/lib/calendar";

// A compact, read-only contribution graph for embedding on the dashboard and on
// public wallet profiles. It links through to the full calendar page.

function dayWord(n: number): string {
  return n === 1 ? "day" : "days";
}

export default function MiniContributionGraph({
  address,
  mode = "recent",
  days = 30,
  title = "Anchoring activity",
  showStreak = false,
}: {
  address: string;
  mode?: "recent" | "year";
  days?: number;
  title?: string;
  showStreak?: boolean;
}) {
  const [data, setData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    let active = true;
    setLoading(true);
    const promise =
      mode === "year" ? buildYearGrid(address) : buildRecentDays(address, days);
    promise
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setData([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [address, mode, days]);

  const streak = showStreak ? getStreakInfo(data) : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 className="text-sm uppercase tracking-wide text-foreground/50">
          {title}
        </h2>
        <Link
          href="/calendar"
          className="text-xs text-foreground/60 hover:text-foreground transition"
        >
          View calendar &rarr;
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-foreground/40">Loading activity...</p>
      ) : (
        <>
          <ContributionGraph days={data} compact />
          {streak ? (
            <p className="mt-3 text-xs text-foreground/50">
              Current streak{" "}
              <span className="text-foreground/80 font-medium">
                {streak.currentStreak} {dayWord(streak.currentStreak)}
              </span>
              . {streak.totalAnchors} anchors in the last {days} days.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
