"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useWallet } from "@/lib/wallet";
import {
  buildCalendar,
  buildYearGrid,
  getActiveDates,
  getStreakInfo,
  type CalendarDay,
  type CalendarMonth,
  type StreakInfo,
} from "@/lib/calendar";
import ContributionGraph from "@/app/components/calendar/ContributionGraph";
import EmptyState from "@/app/components/EmptyState";
import EmptyStateIcon from "@/app/components/EmptyStateIcon";
import { SkeletonLine, SkeletonBlock } from "@/app/components/Skeleton";
import MonthlyCalendar from "@/app/components/calendar/MonthlyCalendar";
import DayDetail from "@/app/components/calendar/DayDetail";

type View = "graph" | "monthly";

const CURRENT_YEAR = new Date().getUTCFullYear();
const CURRENT_MONTH = new Date().getUTCMonth();
const EMPTY_STREAK: StreakInfo = {
  currentStreak: 0,
  longestStreak: 0,
  totalActiveDays: 0,
  totalAnchors: 0,
};

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M12 2c.7 2.6-.6 4.2-2 5.6C8.4 9.2 7 10.7 7 13a5 5 0 0 0 10 .2c0-1.6-.7-3-1.6-4.2-.3 1-1 1.6-1.9 1.8.6-2-.3-4.3-1.5-5.6C11.2 4.4 11 3 12 2z" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-foreground/50 mb-1 flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-semibold tabular-nums ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function dayWord(n: number): string {
  return n === 1 ? "day" : "days";
}

export default function CalendarClient() {
  const { address, connecting, connectWallet } = useWallet();
  const [view, setView] = useState<View>("graph");
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [yearDays, setYearDays] = useState<CalendarDay[]>([]);
  const [monthData, setMonthData] = useState<CalendarMonth | null>(null);
  const [stats, setStats] = useState<StreakInfo>(EMPTY_STREAK);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // The year grid drives the contribution graph and the streak stats.
  useEffect(() => {
    if (!address) return;
    let active = true;
    setLoading(true);
    Promise.all([buildYearGrid(address, year), getActiveDates(address)])
      .then(([days, activeDates]) => {
        if (!active) return;
        setYearDays(days);
        setStats(getStreakInfo(days, activeDates));
      })
      .catch(() => {
        if (!active) return;
        setYearDays([]);
        setStats(EMPTY_STREAK);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [address, year]);

  // The selected month drives the monthly calendar.
  useEffect(() => {
    if (!address) return;
    let active = true;
    buildCalendar(address, year, month)
      .then((data) => {
        if (active) setMonthData(data);
      })
      .catch(() => {
        if (active) setMonthData(null);
      });
    return () => {
      active = false;
    };
  }, [address, year, month]);

  const goPrevMonth = useCallback(() => {
    setSelectedDate(null);
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth(month - 1);
    }
  }, [month]);

  const goNextMonth = useCallback(() => {
    setSelectedDate(null);
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth(month + 1);
    }
  }, [month]);

  const changeYear = (delta: number) => {
    setSelectedDate(null);
    setYear((y) => y + delta);
  };

  const switchView = (next: View) => {
    setSelectedDate(null);
    setView(next);
  };

  const toggleDay = (day: CalendarDay) =>
    setSelectedDate((cur) => (cur === day.date ? null : day.date));

  const activeDays = view === "graph" ? yearDays : (monthData?.days ?? []);
  const selectedDay = selectedDate
    ? (activeDays.find((d) => d.date === selectedDate) ?? null)
    : null;

  const canGoNextMonth = year < CURRENT_YEAR || (year === CURRENT_YEAR && month < CURRENT_MONTH);

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold">Calendar</h1>
        <p className="text-foreground/60 mt-1 text-sm">
          Your anchoring activity over time. Keep your streak going by anchoring regularly.
        </p>
      </header>

      {!address ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">
            Connect your Stacks wallet to see your anchoring calendar and streak.
          </p>
          <button
            type="button"
            onClick={connectWallet}
            disabled={connecting}
            className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-50"
          >
            {connecting ? "Opening..." : "Connect wallet"}
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Current streak"
              icon={<FlameIcon />}
              accent="text-orange-500"
              value={`${stats.currentStreak} ${dayWord(stats.currentStreak)}`}
            />
            <StatCard
              label="Longest streak"
              value={`${stats.longestStreak} ${dayWord(stats.longestStreak)}`}
            />
            <StatCard label="Active days" value={String(stats.totalActiveDays)} />
            <StatCard label={`Anchors in ${year}`} value={String(stats.totalAnchors)} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="inline-flex rounded-md border border-foreground/15 p-0.5 text-sm">
              <button
                type="button"
                onClick={() => switchView("graph")}
                className={`px-3 py-1.5 rounded transition ${
                  view === "graph"
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                Contribution Graph
              </button>
              <button
                type="button"
                onClick={() => switchView("monthly")}
                className={`px-3 py-1.5 rounded transition ${
                  view === "monthly"
                    ? "bg-foreground/10 text-foreground"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                Monthly Calendar
              </button>
            </div>
            <div className="inline-flex items-center gap-3">
              <button
                type="button"
                onClick={() => changeYear(-1)}
                aria-label="Previous year"
                className="px-2.5 py-1 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
              >
                &lsaquo;
              </button>
              <span className="font-mono text-sm w-12 text-center">{year}</span>
              <button
                type="button"
                onClick={() => changeYear(1)}
                disabled={year >= CURRENT_YEAR}
                aria-label="Next year"
                className="px-2.5 py-1 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-40"
              >
                &rsaquo;
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-lg border border-foreground/10 bg-card p-4 sm:p-6">
              <div aria-busy="true" className="space-y-3">
                <SkeletonLine width="12rem" height="1rem" />
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 49 }).map((_, i) => (
                    <SkeletonBlock key={i} height="1.5rem" />
                  ))}
                </div>
              </div>
            </div>
          ) : stats.totalAnchors === 0 ? (
            <EmptyState
              icon={<EmptyStateIcon name="calendar" />}
              title="No anchoring activity this year"
              description="Anchor a document to start your streak."
              actionLabel="Anchor a Document"
              actionHref="/anchor"
            />
          ) : (
            <div className="rounded-lg border border-foreground/10 bg-card p-4 sm:p-6">
              {view === "graph" ? (
                <ContributionGraph
                  days={yearDays}
                  selectedDate={selectedDate}
                  onSelectDay={toggleDay}
                />
              ) : monthData ? (
                <MonthlyCalendar
                  year={year}
                  month={month}
                  days={monthData.days}
                  canGoNext={canGoNextMonth}
                  onPrev={goPrevMonth}
                  onNext={goNextMonth}
                  selectedDate={selectedDate}
                  onSelectDay={toggleDay}
                />
              ) : (
                <p className="text-sm text-foreground/50 py-10 text-center">Loading month...</p>
              )}
            </div>
          )}

          <DayDetail day={selectedDay} owner={address} onClose={() => setSelectedDate(null)} />
        </>
      )}
    </main>
  );
}
