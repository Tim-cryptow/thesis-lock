"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import ErrorFallback from "@/app/components/ErrorFallback";
import { truncateAddress, useWallet } from "@/lib/wallet";
import type { WalletAnalytics } from "@/lib/analytics";

const CHART_DAYS = 30;

const SOURCE_META = [
  { key: "single", label: "Single", bar: "bg-blue-500", dot: "bg-blue-500" },
  { key: "batch", label: "Batch", bar: "bg-green-500", dot: "bg-green-500" },
  { key: "group", label: "Group", bar: "bg-purple-500", dot: "bg-purple-500" },
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
      setError("Could not load your analytics. Try again soon.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!address) {
      setAnalytics(null);
      return;
    }
    void load(address);
  }, [address, load]);

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
            &larr; ThesisLock
          </Link>
          <Link
            href="/search"
            className="text-foreground/60 hover:text-foreground"
          >
            Search
          </Link>
          <Link
            href="/anchor"
            className="text-foreground/60 hover:text-foreground"
          >
            Anchor
          </Link>
          <Link
            href="/anchors"
            className="text-foreground/60 hover:text-foreground"
          >
            My Anchors
          </Link>
          <Link
            href="/groups"
            className="text-foreground/60 hover:text-foreground"
          >
            Groups
          </Link>
          <Link href="/feed" className="text-foreground/60 hover:text-foreground">
            Feed
          </Link>
          <Link
            href="/stats"
            className="text-foreground/60 hover:text-foreground"
          >
            Stats
          </Link>
          <span className="text-foreground font-medium">Dashboard</span>
        </div>
        {address ? (
          <button
            onClick={disconnectWallet}
            className="text-sm font-mono px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            title="Disconnect"
          >
            {truncateAddress(address)}
          </button>
        ) : (
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="text-sm px-3 py-2 rounded-md bg-heading text-background hover:opacity-90 disabled:opacity-50"
          >
            {connecting ? "Opening wallet..." : "Connect wallet"}
          </button>
        )}
      </div>

      <h1 className="text-3xl mb-2">My dashboard</h1>
      <p className="text-foreground/70 mb-8">
        Your anchoring activity on the ThesisLock contracts, by source and over
        time.
      </p>

      {!address ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">
            Connect your Stacks wallet to view your personal analytics.
          </p>
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-50"
          >
            {connecting ? "Opening wallet..." : "Connect wallet"}
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
              label="Total anchors"
              value={formatNumber(analytics.totalAnchors)}
              hint={`${formatNumber(analytics.anchorsBySource.single)} single, ${formatNumber(analytics.anchorsBySource.batch)} batch, ${formatNumber(analytics.anchorsBySource.group)} group`}
              title={`${analytics.anchorsBySource.single} single, ${analytics.anchorsBySource.batch} batch, ${analytics.anchorsBySource.group} group`}
            />
            <StatCard
              label="Proof NFTs minted"
              value={formatNumber(analytics.proofNFTsMinted)}
            />
            <StatCard
              label="Groups joined"
              value={formatNumber(analytics.totalGroups)}
            />
            <StatCard
              label="Active since"
              value={activeSince ? formatDateLabel(activeSince) : "-"}
              hint={
                analytics.firstAnchorBlock
                  ? `Block ${formatNumber(analytics.firstAnchorBlock)}`
                  : undefined
              }
            />
          </div>

          <section className="rounded-lg border border-foreground/10 bg-card p-6 mb-8">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h2 className="text-sm uppercase tracking-wide text-foreground/50">
                Activity, last {CHART_DAYS} days
              </h2>
              <div className="flex items-center gap-3 text-xs text-foreground/60">
                {SOURCE_META.map((s) => (
                  <span key={s.key} className="flex items-center gap-1">
                    <span className={`inline-block h-2 w-2 rounded-sm ${s.dot}`} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
            {maxDayCount === 0 ? (
              <p className="text-sm text-foreground/60">
                No anchoring activity in this window yet.
              </p>
            ) : (
              <div
                className="flex items-end gap-1 h-40"
                role="img"
                aria-label="Daily anchoring activity by source"
              >
                {chartDays.map((d) => {
                  const total = maxDayCount
                    ? (d.count / maxDayCount) * 100
                    : 0;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col justify-end h-full"
                      title={`${formatDateLabel(d.date)}: ${d.count} (${d.single} single, ${d.batch} batch, ${d.group} group)`}
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
        </>
      )}
    </div>
  );
}
