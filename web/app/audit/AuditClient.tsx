"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import AuditReportGenerator from "./AuditReportGenerator";
import { useI18n } from "@/app/components/I18nProvider";
import {
  AUDIT_CATEGORIES,
  AUDIT_CHANGED_EVENT,
  getAuditLog,
  truncateMiddle,
  type AuditEntry,
} from "@/lib/audit";

const PAGE_SIZE = 50;

const CATEGORY_STYLES: Record<string, string> = {
  anchor: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  verify: "bg-green-500/15 text-green-600 dark:text-green-400",
  group: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  proof: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  export: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  search: "bg-pink-500/15 text-pink-600 dark:text-pink-400",
  system: "bg-foreground/10 text-foreground/70",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function AuditClient() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  const [category, setCategory] = useState("");
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const sync = () => setEntries(getAuditLog());
    sync();
    window.addEventListener(AUDIT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUDIT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Summary is always over the full log, independent of the table filters.
  const summary = useMemo(() => {
    const todayStart = startOfTodayIso();
    const sessions = new Set<string>();
    const byCategory: Record<string, number> = {};
    let today = 0;
    for (const e of entries) {
      sessions.add(e.sessionId);
      byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
      if (e.timestamp >= todayStart) today += 1;
    }
    return {
      total: entries.length,
      today,
      sessions: sessions.size,
      byCategory,
    };
  }, [entries]);

  const maxCategory = useMemo(
    () => Math.max(1, ...Object.values(summary.byCategory)),
    [summary],
  );

  const filtered = useMemo(() => {
    const from = dateFrom ? `${dateFrom}T00:00:00.000Z` : "";
    const to = dateTo ? `${dateTo}T23:59:59.999Z` : "";
    const a = action.trim().toLowerCase();
    const who = actor.trim().toLowerCase();
    const rows = entries.filter((e) => {
      if (category && e.category !== category) return false;
      if (a && !e.action.toLowerCase().includes(a)) return false;
      if (who && !(e.actor ?? "").toLowerCase().includes(who)) return false;
      if (from && e.timestamp < from) return false;
      if (to && e.timestamp > to) return false;
      return true;
    });
    rows.sort((x, y) =>
      sortDesc
        ? y.timestamp.localeCompare(x.timestamp)
        : x.timestamp.localeCompare(y.timestamp),
    );
    return rows;
  }, [entries, category, action, actor, dateFrom, dateTo, sortDesc]);

  // Reset to the first page whenever the filtered set changes shape.
  useEffect(() => {
    setPage(0);
  }, [category, action, actor, dateFrom, dateTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    current * PAGE_SIZE,
    current * PAGE_SIZE + PAGE_SIZE,
  );

  const clearFilters = () => {
    setCategory("");
    setAction("");
    setActor("");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters =
    category || action || actor || dateFrom || dateTo ? true : false;

  return (
    <div className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.back")}
        </Link>
        <Link href="/docs" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.docs")}
        </Link>
        <span className="text-foreground font-medium">Audit Trail</span>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl mb-2">Audit Trail</h1>
        <p className="text-foreground/70 max-w-3xl">
          A tamper-evident record of every action taken in this browser. Each
          entry is timestamped and tied to a session; the log can be filtered,
          verified for integrity, and exported as a compliance report. All data
          stays on this device.
        </p>
      </header>

      {/* Summary */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-lg border border-foreground/10 bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-foreground/50">
            Total actions
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {summary.total}
          </div>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-foreground/50">
            Actions today
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {summary.today}
          </div>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-foreground/50">
            Unique sessions
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {summary.sessions}
          </div>
        </div>
        <div className="rounded-lg border border-foreground/10 bg-card p-5">
          <div className="mb-2 text-xs uppercase tracking-wide text-foreground/50">
            By category
          </div>
          <div className="flex flex-col gap-1">
            {AUDIT_CATEGORIES.filter((c) => summary.byCategory[c]).map((c) => (
              <div key={c} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[11px] text-foreground/60">
                  {c}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/5">
                  <div
                    className="h-full rounded-full bg-foreground/40"
                    style={{
                      width: `${((summary.byCategory[c] ?? 0) / maxCategory) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-foreground/50">
                  {summary.byCategory[c]}
                </span>
              </div>
            ))}
            {summary.total === 0 && (
              <span className="text-xs text-foreground/40">No actions yet.</span>
            )}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-foreground/50">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-sm text-foreground"
          >
            <option value="">All</option>
            {AUDIT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/50">
          Action
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. anchor"
            className="rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/50">
          Actor
          <input
            type="text"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="principal"
            className="rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/50">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/50">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-sm"
          />
        </label>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm text-foreground/70 hover:border-foreground/40"
          >
            Clear
          </button>
        )}
      </section>

      {/* Table */}
      <section className="rounded-lg border border-foreground/10 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-xs uppercase tracking-wide text-foreground/50">
                <th className="px-4 py-2 font-medium">
                  <button
                    type="button"
                    onClick={() => setSortDesc((s) => !s)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Timestamp {sortDesc ? "v" : "^"}
                  </button>
                </th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Actor</th>
                <th className="px-4 py-2 font-medium">Target</th>
                <th className="px-4 py-2 font-medium">Session</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-foreground/5 last:border-0 align-top"
                >
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-foreground/70">
                    {formatTimestamp(e.timestamp)}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        CATEGORY_STYLES[e.category] ?? CATEGORY_STYLES.system
                      }`}
                    >
                      {e.category}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground/70">
                    {e.actor ? truncateMiddle(e.actor) : "n/a"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground/70">
                    {e.target ? truncateMiddle(e.target) : "n/a"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground/50">
                    {truncateMiddle(e.sessionId, 6, 4)}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-foreground/50"
                  >
                    {entries.length === 0
                      ? "No actions have been logged yet."
                      : "No entries match the filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-4 border-t border-foreground/10 px-4 py-3 text-sm">
            <span className="text-xs text-foreground/50">
              {current * PAGE_SIZE + 1}-
              {Math.min((current + 1) * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={current === 0}
                className="rounded-md border border-foreground/15 px-3 py-1 hover:border-foreground/40 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={current >= pageCount - 1}
                className="rounded-md border border-foreground/15 px-3 py-1 hover:border-foreground/40 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <AuditReportGenerator />
    </div>
  );
}
