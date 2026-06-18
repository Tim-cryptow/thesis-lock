"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import ErrorFallback from "@/app/components/ErrorFallback";
import { useI18n } from "@/app/components/I18nProvider";
import { truncateAddress, useWallet } from "@/lib/wallet";
import { fetchAllAnchors } from "@/lib/fetchAllAnchors";
import { stageReportInput } from "@/lib/reportLink";
import {
  downloadExport,
  formatAnchorsCSV,
  formatAnchorsJSON,
} from "@/lib/export";
import type { WalletAnalytics } from "@/lib/analytics";
import {
  activityCategory,
  type ActivityCategory,
  type ActivityEvent,
} from "@/lib/activityLog";
import { describeActivity } from "@/lib/activityDescriptions";

const CHART_DAYS = 30;

const RECENT_LIMIT = 5;
// Pull a wider transaction window than we display, so the preview still finds
// ThesisLock events when a wallet's most recent transactions are unrelated.
const RECENT_FETCH = 20;

// Icon badge colors per activity category, matching the full activity timeline.
const CATEGORY_BADGE: Record<ActivityCategory, string> = {
  anchors: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  groups: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  proofs: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  registry: "bg-foreground/10 text-foreground/60",
};

const SOURCE_META = [
  { key: "single", id: "sourceSingle", bar: "bg-blue-500", dot: "bg-blue-500" },
  { key: "batch", id: "sourceBatch", bar: "bg-green-500", dot: "bg-green-500" },
  { key: "group", id: "sourceGroup", bar: "bg-purple-500", dot: "bg-purple-500" },
] as const;

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatRelativeTime(
  iso: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return t("dashboard.timeJustNow");
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return t("dashboard.timeMinutesAgo", { count: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return t("dashboard.timeHoursAgo", { count: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return t("dashboard.timeDaysAgo", { count: days });
  const months = Math.round(days / 30);
  if (months < 12) return t("dashboard.timeMonthsAgo", { count: months });
  return t("dashboard.timeYearsAgo", { count: Math.round(months / 12) });
}

type ChartDay = {
  date: string;
  single: number;
  batch: number;
  group: number;
  count: number;
};

// The fetcher only returns days that had activity, so build a fixed window of
// the last CHART_DAYS calendar days and fill the gaps with zeroes.
function buildChartWindow(analytics: WalletAnalytics): ChartDay[] {
  const bySource = new Map(analytics.anchorsByDay.map((d) => [d.date, d]));
  const days: ChartDay[] = [];
  const today = new Date();
  for (let i = CHART_DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    d.setUTCDate(d.getUTCDate() - i);
    const date = d.toISOString().slice(0, 10);
    const hit = bySource.get(date);
    days.push({
      date,
      single: hit?.single ?? 0,
      batch: hit?.batch ?? 0,
      group: hit?.group ?? 0,
      count: hit?.count ?? 0,
    });
  }
  return days;
}

function StatCard({
  label,
  value,
  hint,
  title,
}: {
  label: string;
  value: string;
  hint?: string;
  title?: string;
}) {
  return (
    <div
      className="rounded-lg border border-foreground/10 bg-card p-6"
      title={title}
    >
      <div className="text-xs uppercase tracking-wide text-foreground/50 mb-2">
        {label}
      </div>
      <div className="text-3xl font-mono">{value}</div>
      {hint ? (
        <div className="mt-2 text-xs text-foreground/50">{hint}</div>
      ) : null}
    </div>
  );
}

export default function DashboardClient() {
  const { t } = useI18n();
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();
  const [analytics, setAnalytics] = useState<WalletAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (owner: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/analytics?address=${encodeURIComponent(owner)}`,
      );
      if (!res.ok) throw new Error(`analytics fetch failed: ${res.status}`);
      const data = (await res.json()) as WalletAnalytics;
      setAnalytics(data);
    } catch {
      setError(t("dashboard.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!address) {
      setAnalytics(null);
      return;
    }
    void load(address);
  }, [address, load]);

  // The compact activity feed reads the unified activity log directly, so it
  // stays consistent with the full /activity timeline.
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    // Clear on every wallet change so the previous wallet's events don't linger
    // under the new one while its request is in flight (the analytics request
    // can resolve first and exit the loading branch).
    setRecentEvents([]);
    if (!address) return;
    let cancelled = false;
    // The API filters unrelated Hiro transactions after paging, so a single raw
    // window can come back empty even when the wallet has older ThesisLock
    // activity. Page forward until five events are collected or the stream ends,
    // with a cap so a busy non-ThesisLock wallet doesn't scan forever.
    const MAX_PREVIEW_PAGES = 5;
    void (async () => {
      const collected: ActivityEvent[] = [];
      try {
        for (let page = 0; page < MAX_PREVIEW_PAGES; page += 1) {
          const res = await fetch(
            `/api/activity?address=${encodeURIComponent(address)}&page=${page}&limit=${RECENT_FETCH}`,
          );
          if (!res.ok) break;
          const data = (await res.json()) as {
            events: ActivityEvent[];
            hasMore: boolean;
          };
          collected.push(...data.events);
          if (collected.length >= RECENT_LIMIT || !data.hasMore) break;
        }
        if (!cancelled) setRecentEvents(collected.slice(0, RECENT_LIMIT));
      } catch {
        if (!cancelled) setRecentEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const router = useRouter();

  const handleExport = async (format: "csv" | "json") => {
    if (!address) return;
    setExportError(null);
    setExporting(format);
    try {
      const all = await fetchAllAnchors(address);
      const stamp = address.slice(0, 8);
      if (format === "csv") {
        downloadExport(
          formatAnchorsCSV(all, address),
          `thesislock-anchors-${stamp}.csv`,
          "text/csv;charset=utf-8",
        );
      } else {
        downloadExport(
          formatAnchorsJSON(all, address),
          `thesislock-anchors-${stamp}.json`,
          "application/json",
        );
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : t("dashboard.exportError"));
      setTimeout(() => setExportError(null), 4000);
    } finally {
      setExporting(null);
    }
  };

  // Stage every anchor this wallet owns, then open the report builder
  // pre-populated. Fetching is async, so this navigates only once staged.
  const handleGenerateReport = async () => {
    if (!address) return;
    setReportLoading(true);
    try {
      const all = await fetchAllAnchors(address);
      stageReportInput(all.map((entry) => ({ hash: entry.hash })));
      router.push("/report");
    } catch (e) {
      setExportError(e instanceof Error ? e.message : t("dashboard.exportError"));
      setTimeout(() => setExportError(null), 4000);
    } finally {
      setReportLoading(false);
    }
  };

  const chartDays = useMemo(
    () => (analytics ? buildChartWindow(analytics) : []),
    [analytics],
  );
  const maxDayCount = useMemo(
    () => chartDays.reduce((max, d) => Math.max(max, d.count), 0),
    [chartDays],
  );

  const activeSince =
    analytics && analytics.anchorsByDay.length > 0
      ? analytics.anchorsByDay[0].date
      : null;

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm flex-wrap">
          <div className="order-last ml-auto">
            <ThemeToggle />
          </div>
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.back")}
          </Link>
          <Link
            href="/search"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.search")}
          </Link>
          <Link
            href="/anchor"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.anchor")}
          </Link>
          <Link
            href="/anchors"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.myAnchors")}
          </Link>
          {address && (
            <Link
              href={`/u/${address}`}
              className="text-foreground/60 hover:text-foreground"
            >
              {t("common.nav.myProfile")}
            </Link>
          )}
          <Link
            href="/groups"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.groups")}
          </Link>
          <Link href="/feed" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.feed")}
          </Link>
          <Link
            href="/stats"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.stats")}
          </Link>
          <span className="text-foreground font-medium">
            {t("common.nav.dashboard")}
          </span>
          <Link
            href="/activity"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.activity")}
          </Link>
          <Link
            href="/compare"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.compare")}
          </Link>
        </div>
        {address ? (
          <button
            onClick={disconnectWallet}
            className="text-sm font-mono px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            title={t("common.wallet.disconnect")}
          >
            {truncateAddress(address)}
          </button>
        ) : (
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="text-sm px-3 py-2 rounded-md bg-heading text-background hover:opacity-90 disabled:opacity-50"
          >
            {connecting
              ? t("common.wallet.opening")
              : t("common.wallet.connect")}
          </button>
        )}
      </div>

      <h1 className="text-3xl mb-2">{t("dashboard.title")}</h1>
      <p className="text-foreground/70 mb-8">{t("dashboard.subtitle")}</p>

      {!address ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">
            {t("dashboard.connectPrompt")}
          </p>
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-50"
          >
            {connecting
              ? t("common.wallet.opening")
              : t("common.wallet.connect")}
          </button>
        </div>
      ) : error ? (
        <ErrorFallback message={error} onRetry={() => void load(address)} />
      ) : loading || !analytics ? (
        <div aria-busy="true">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-foreground/10 bg-card p-6"
              >
                <div className="h-3 w-20 rounded bg-foreground/10 animate-pulse mb-3" />
                <div className="h-8 w-24 rounded bg-foreground/10 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-foreground/10 bg-card p-6">
            <div className="h-40 w-full rounded bg-foreground/10 animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <StatCard
              label={t("dashboard.statTotalAnchors")}
              value={formatNumber(analytics.totalAnchors)}
              hint={t("dashboard.sourceBreakdown", {
                single: formatNumber(analytics.anchorsBySource.single),
                batch: formatNumber(analytics.anchorsBySource.batch),
                group: formatNumber(analytics.anchorsBySource.group),
              })}
              title={t("dashboard.sourceBreakdown", {
                single: analytics.anchorsBySource.single,
                batch: analytics.anchorsBySource.batch,
                group: analytics.anchorsBySource.group,
              })}
            />
            <StatCard
              label={t("dashboard.statProofNFTs")}
              value={formatNumber(analytics.proofNFTsMinted)}
            />
            <StatCard
              label={t("dashboard.statGroupsJoined")}
              value={formatNumber(analytics.totalGroups)}
            />
            <StatCard
              label={t("dashboard.statActiveSince")}
              value={activeSince ? formatDateLabel(activeSince) : "-"}
              hint={
                analytics.firstAnchorBlock
                  ? t("dashboard.blockHint", {
                      block: formatNumber(analytics.firstAnchorBlock),
                    })
                  : undefined
              }
            />
          </div>

          <section className="rounded-lg border border-foreground/10 bg-card p-6 mb-8">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h2 className="text-sm uppercase tracking-wide text-foreground/50">
                {t("dashboard.activityHeading", { days: CHART_DAYS })}
              </h2>
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                {SOURCE_META.map((s) => (
                  <span key={s.key} className="flex items-center gap-1">
                    <span className={`inline-block h-2 w-2 rounded-sm ${s.dot}`} />
                    {t(`dashboard.${s.id}`)}
                  </span>
                ))}
              </div>
            </div>
            {maxDayCount === 0 ? (
              <p className="text-sm text-foreground/60">
                {t("dashboard.activityEmpty")}
              </p>
            ) : (
              <div
                className="flex items-end gap-1 h-40"
                role="img"
                aria-label={t("dashboard.chartAria")}
              >
                {chartDays.map((d) => {
                  const total = maxDayCount
                    ? (d.count / maxDayCount) * 100
                    : 0;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col justify-end h-full"
                      title={t("dashboard.barTitle", {
                        date: formatDateLabel(d.date),
                        count: d.count,
                        single: d.single,
                        batch: d.batch,
                        group: d.group,
                      })}
                    >
                      <div
                        className="w-full flex flex-col-reverse"
                        style={{ height: `${total}%` }}
                      >
                        {SOURCE_META.map((s) => {
                          const v = d[s.key];
                          if (v <= 0) return null;
                          const pct = (v / d.count) * 100;
                          return (
                            <div
                              key={s.key}
                              className={s.bar}
                              style={{ height: `${pct}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {maxDayCount > 0 && (
              <div className="flex justify-between text-[10px] text-foreground/40 mt-2">
                <span>{formatDateLabel(chartDays[0].date)}</span>
                <span>
                  {formatDateLabel(chartDays[chartDays.length - 1].date)}
                </span>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-foreground/10 bg-card p-6 mb-8">
            <h2 className="text-sm uppercase tracking-wide text-foreground/50 mb-4">
              {t("dashboard.bySourceHeading")}
            </h2>
            {analytics.totalAnchors === 0 ? (
              <p className="text-sm text-foreground/60">
                {t("dashboard.noAnchors")}
              </p>
            ) : (
              <>
                <div className="flex h-4 w-full overflow-hidden rounded-full bg-foreground/10">
                  {SOURCE_META.map((s) => {
                    const v = analytics.anchorsBySource[s.key];
                    if (v <= 0) return null;
                    const pct = (v / analytics.totalAnchors) * 100;
                    return (
                      <div
                        key={s.key}
                        className={s.bar}
                        style={{ width: `${pct}%` }}
                        title={t("dashboard.sourceBarTitle", {
                          label: t(`dashboard.${s.id}`),
                          count: formatNumber(v),
                          pct: pct.toFixed(1),
                        })}
                      />
                    );
                  })}
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  {SOURCE_META.map((s) => {
                    const v = analytics.anchorsBySource[s.key];
                    const pct = analytics.totalAnchors
                      ? (v / analytics.totalAnchors) * 100
                      : 0;
                    return (
                      <div key={s.key} className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-sm ${s.dot}`}
                        />
                        <span className="text-foreground/70">
                          {t(`dashboard.${s.id}`)}
                        </span>
                        <span className="ml-auto font-mono text-xs text-foreground/60">
                          {formatNumber(v)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section className="rounded-lg border border-foreground/10 bg-card p-6 mb-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-sm uppercase tracking-wide text-foreground/50">
                {t("dashboard.recentHeading")}
              </h2>
              <Link
                href="/activity"
                className="text-xs text-foreground/60 hover:text-foreground shrink-0"
              >
                {t("dashboard.viewAllActivity")} &rarr;
              </Link>
            </div>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-foreground/60">
                {t("dashboard.noActivity")}
              </p>
            ) : (
              <ul className="divide-y divide-foreground/10">
                {recentEvents.map((event) => {
                  const { title, subtitle, icon } = describeActivity(event);
                  return (
                    <li
                      key={event.id}
                      className="flex items-center gap-3 py-3"
                    >
                      <span
                        aria-hidden="true"
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${CATEGORY_BADGE[activityCategory(event.type)]}`}
                      >
                        {icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground/90">{title}</div>
                        {subtitle && (
                          <div className="text-xs text-foreground/50 font-mono truncate">
                            {subtitle}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-foreground/50 shrink-0">
                        {formatRelativeTime(event.timestamp, t)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-foreground/10 bg-card p-6">
            <h2 className="text-sm uppercase tracking-wide text-foreground/50 mb-2">
              {t("dashboard.exportHeading")}
            </h2>
            <p className="text-sm text-foreground/60 mb-4">
              {t("dashboard.exportDescription")}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void handleExport("csv")}
                disabled={exporting !== null}
                className="text-sm px-4 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
              >
                {exporting === "csv"
                  ? t("dashboard.exporting")
                  : t("dashboard.exportCSV")}
              </button>
              <button
                onClick={() => void handleExport("json")}
                disabled={exporting !== null}
                className="text-sm px-4 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
              >
                {exporting === "json"
                  ? t("dashboard.exporting")
                  : t("dashboard.exportJSON")}
              </button>
              <button
                onClick={() => void handleGenerateReport()}
                disabled={reportLoading}
                className="text-sm px-4 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
              >
                {reportLoading
                  ? t("dashboard.exporting")
                  : t("dashboard.generateReport")}
              </button>
            </div>
            {exportError && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                {exportError}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
