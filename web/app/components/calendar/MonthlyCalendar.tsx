"use client";

import type { CalendarDay } from "@/lib/calendar";

// A traditional month grid. Days with anchors carry a colored dot and count;
// today is outlined, future days are dimmed, and selecting a day surfaces it in
// the shared day-detail panel below the calendar.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

function dotClass(count: number): string {
  if (count >= 6) return "bg-emerald-700 dark:bg-emerald-400";
  if (count >= 4) return "bg-emerald-500 dark:bg-emerald-600";
  if (count >= 2) return "bg-emerald-400 dark:bg-emerald-700";
  return "bg-emerald-300 dark:bg-emerald-800";
}

function anchorWord(n: number): string {
  return n === 1 ? "anchor" : "anchors";
}

export default function MonthlyCalendar({
  year,
  month,
  days,
  canGoNext,
  onPrev,
  onNext,
  selectedDate,
  onSelectDay,
}: {
  year: number;
  month: number;
  days: CalendarDay[];
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  selectedDate: string | null;
  onSelectDay: (day: CalendarDay) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const lead = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const cells: (CalendarDay | null)[] = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (const day of days) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous month"
          className="px-2.5 py-1 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
        >
          &lsaquo;
        </button>
        <h3 className="font-semibold">
          {MONTHS[month]} {year}
        </h3>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Next month"
          className="px-2.5 py-1 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-40"
        >
          &rsaquo;
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="text-center text-[11px] uppercase tracking-wide text-foreground/40 py-1"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} className="aspect-square" />;
          const dayNum = Number(cell.date.slice(8, 10));
          const isToday = cell.date === today;
          const future = cell.date > today;
          const selected = selectedDate === cell.date;
          const has = cell.count > 0;
          const title = `${MONTHS[month]} ${dayNum}: ${
            has ? `${cell.count} ${anchorWord(cell.count)}` : "no anchors"
          }`;
          const border = selected
            ? "border-foreground"
            : isToday
              ? "border-emerald-500"
              : "border-foreground/10";
          const className = `aspect-square rounded-md border ${border} p-1 flex flex-col justify-between ${
            future ? "opacity-40" : "hover:border-foreground/40"
          }`;
          const inner = (
            <>
              <span
                className={`text-xs ${
                  isToday ? "font-semibold text-foreground" : "text-foreground/70"
                }`}
              >
                {dayNum}
              </span>
              {has ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-foreground/70">
                  <span className={`h-1.5 w-1.5 rounded-full ${dotClass(cell.count)}`} />
                  {cell.count}
                </span>
              ) : (
                <span className="h-1.5" />
              )}
            </>
          );
          if (future) {
            return (
              <div key={i} className={className} title={title}>
                {inner}
              </div>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(cell)}
              title={title}
              aria-label={title}
              className={`${className} text-left transition`}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
