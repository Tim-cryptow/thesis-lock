"use client";

import type { CalendarDay } from "@/lib/calendar";

// GitHub-style contribution grid: weeks as columns, weekdays as rows, each cell
// shaded by how many documents were anchored that day. Reused full-size on the
// calendar page and in a compact form on the dashboard and wallet profiles.

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// Row labels (Sunday first). Only Mon, Wed, and Fri are shown, like GitHub.
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

const LEVEL_CLASSES = [
  "bg-foreground/[0.08]",
  "bg-emerald-200 dark:bg-emerald-900",
  "bg-emerald-300 dark:bg-emerald-700",
  "bg-emerald-500 dark:bg-emerald-600",
  "bg-emerald-700 dark:bg-emerald-400",
];

function level(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function formatLong(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function anchorWord(n: number): string {
  return n === 1 ? "anchor" : "anchors";
}

type Cell = CalendarDay | null;

// Pads the leading days so the first column starts on the right weekday, then
// pads the trailing days to complete the last week, and chunks into weeks.
function toWeeks(days: CalendarDay[]): Cell[][] {
  if (days.length === 0) return [];
  const lead = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const cells: Cell[] = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (const day of days) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// One month abbreviation per week column, shown only where the month changes.
function monthLabels(weeks: Cell[][]): string[] {
  const labels: string[] = [];
  let prev = -1;
  for (const week of weeks) {
    const first = week.find((c): c is CalendarDay => c !== null);
    if (!first) {
      labels.push("");
      continue;
    }
    const m = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
    if (m !== prev) {
      labels.push(MONTHS[m]);
      prev = m;
    } else {
      labels.push("");
    }
  }
  return labels;
}

export default function ContributionGraph({
  days,
  onSelectDay,
  selectedDate,
  compact = false,
}: {
  days: CalendarDay[];
  onSelectDay?: (day: CalendarDay) => void;
  selectedDate?: string | null;
  compact?: boolean;
}) {
  const weeks = toWeeks(days);
  const labels = compact ? [] : monthLabels(weeks);
  const today = new Date().toISOString().slice(0, 10);
  const cellSize = compact ? "h-2.5 w-2.5" : "h-3 w-3";

  if (weeks.length === 0) {
    return (
      <p className="text-sm text-foreground/50 py-6 text-center">
        No anchoring activity to show yet.
      </p>
    );
  }

  const renderCell = (cell: Cell, key: number) => {
    if (!cell) {
      return <span key={key} className={`${cellSize} rounded-sm`} aria-hidden="true" />;
    }
    const future = cell.date > today;
    const title = `${formatLong(cell.date)}: ${
      cell.count === 0 ? "No anchors" : `${cell.count} ${anchorWord(cell.count)}`
    }`;
    const base = `${cellSize} rounded-sm ${LEVEL_CLASSES[level(cell.count)]}`;
    if (future) {
      return (
        <span
          key={key}
          className={`${base} opacity-30`}
          title={title}
          aria-hidden="true"
        />
      );
    }
    if (!onSelectDay) {
      return <span key={key} className={base} title={title} />;
    }
    const selected = selectedDate === cell.date;
    return (
      <button
        key={key}
        type="button"
        title={title}
        aria-label={title}
        onClick={() => onSelectDay(cell)}
        className={`${base} transition hover:ring-1 hover:ring-foreground/40 ${
          selected ? "ring-2 ring-foreground ring-offset-1 ring-offset-card" : ""
        }`}
      />
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex gap-2">
        {!compact ? (
          <div className="flex flex-col gap-1 pr-1">
            <span className="h-4" aria-hidden="true" />
            {WEEKDAY_LABELS.map((label, i) => (
              <span
                key={i}
                className="h-3 text-[10px] leading-3 text-foreground/40"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          {!compact ? (
            <div className="flex gap-1">
              {labels.map((label, i) => (
                <span
                  key={i}
                  className="w-3 text-[10px] leading-4 text-foreground/40 overflow-visible whitespace-nowrap"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((cell, ri) => renderCell(cell, ri))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {!compact ? (
        <div className="flex items-center gap-1.5 text-xs text-foreground/50 mt-3">
          <span className="mr-1">Less</span>
          {LEVEL_CLASSES.map((cls, i) => (
            <span key={i} className={`h-3 w-3 rounded-sm ${cls}`} />
          ))}
          <span className="ml-1">More</span>
        </div>
      ) : null}
    </div>
  );
}
