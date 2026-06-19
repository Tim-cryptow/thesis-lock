"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import CollectionsNavLink from "@/app/components/CollectionsNavLink";
import ThemeToggle from "@/app/components/ThemeToggle";
import ErrorFallback from "@/app/components/ErrorFallback";
import { useI18n } from "@/app/components/I18nProvider";
import { explorerAddressUrl } from "@/lib/stacks";
import type { ProtocolStats } from "@/lib/stats";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const SINGLE_CONTRACT_NAME =
  process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";

const CONTRACTS = [
  { name: SINGLE_CONTRACT_NAME, labelId: "single" },
  { name: "thesislock-batch", labelId: "batch" },
  { name: "thesislock-registry", labelId: "registry" },
];

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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-6">
      <div className="text-xs uppercase tracking-wide text-foreground/50 mb-2">
        {label}
      </div>
      <div className="text-3xl font-mono">{value}</div>
    </div>
  );
}

export default function StatsClient() {
  const { t } = useI18n();
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error(`stats fetch failed: ${res.status}`);
      const data = (await res.json()) as ProtocolStats;
      setStats(data);
    } catch {
      setError(t("stats.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDayCount = stats
    ? stats.anchorsByDay.reduce((max, d) => Math.max(max, d.count), 0)
    : 0;

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <div className="order-last ml-auto"><ThemeToggle /></div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.back")}
        </Link>
        <Link href="/search" className="text-foreground/60 hover:text-foreground">
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
        <Link
          href="/groups"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.groups")}
        </Link>
        <Link href="/feed" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.feed")}
        </Link>
        <span className="text-foreground font-medium">{t("common.nav.stats")}</span>
        <Link
          href="/verify-bulk"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.bulkVerify")}
        </Link>
        <Link
          href="/dashboard"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.dashboard")}
        </Link>
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
        <Link
          href="/report"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.report")}
        </Link>
        <Link
          href="/explorer"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.explorer")}
        </Link>
          <WatchlistNavLink />
          <CollectionsNavLink />
      </div>

      <h1 className="text-3xl mb-2">{t("stats.title")}</h1>
      <p className="text-foreground/70 mb-2">
        {t("stats.subtitle")}
      </p>
      <p className="mb-8">
        <Link
          href="/explorer"
          className="text-sm text-foreground/60 underline hover:text-foreground"
        >
          Explore the contracts behind these numbers &rarr;
        </Link>
      </p>

      {error ? (
        <ErrorFallback message={error} onRetry={() => void load()} />
      ) : loading ? (
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
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <StatCard
              label={t("stats.totalAnchors")}
              value={formatNumber(stats.totalAnchors)}
            />
            <StatCard
              label={t("stats.uniqueWallets")}
              value={formatNumber(stats.uniqueWallets)}
            />
            <StatCard
              label={t("stats.contractsDeployed")}
              value={formatNumber(stats.contractsDeployed)}
            />
            <StatCard
              label={t("stats.latestBlock")}
              value={
                stats.latestAnchorBlock
                  ? formatNumber(stats.latestAnchorBlock)
                  : "-"
              }
            />
          </div>

          <section className="rounded-lg border border-foreground/10 bg-card p-6 mb-8">
            <h2 className="text-sm uppercase tracking-wide text-foreground/50 mb-4">
              {t("stats.activityPerDay")}
            </h2>
            {stats.anchorsByDay.length === 0 ? (
              <p className="text-sm text-foreground/60">{t("stats.noActivity")}</p>
            ) : (
              <div
                className="flex items-end gap-1 h-40"
                role="img"
                aria-label={t("stats.chartAria")}
              >
                {stats.anchorsByDay.map((d) => {
                  const pct = maxDayCount
                    ? Math.max(4, (d.count / maxDayCount) * 100)
                    : 0;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center justify-end h-full group"
                      title={`${formatDateLabel(d.date)}: ${d.count}`}
                    >
                      <div className="text-[10px] text-foreground/50 mb-1">
                        {d.count}
                      </div>
                      <div
                        className="w-full rounded-t bg-heading/80 group-hover:bg-heading transition"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {stats.anchorsByDay.length > 0 && (
              <div className="flex justify-between text-[10px] text-foreground/40 mt-2">
                <span>
                  {formatDateLabel(stats.anchorsByDay[0].date)}
                </span>
                <span>
                  {formatDateLabel(
                    stats.anchorsByDay[stats.anchorsByDay.length - 1].date,
                  )}
                </span>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-foreground/10 bg-card p-6">
            <h2 className="text-sm uppercase tracking-wide text-foreground/50 mb-4">
              {t("stats.deployedContracts")}
            </h2>
            <ul className="space-y-3">
              {CONTRACTS.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="min-w-0">
                    <code className="font-mono text-sm">{c.name}</code>
                    <span className="ml-2 text-xs text-foreground/50">
                      {t(`stats.contract.${c.labelId}`)}
                    </span>
                  </div>
                  <a
                    href={explorerAddressUrl(`${CONTRACT_ADDRESS}.${c.name}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline hover:no-underline shrink-0"
                  >
                    {t("stats.viewOnExplorer")}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-xs text-foreground/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <span>
                {t("stats.singleAnchors", {
                  count: formatNumber(
                    stats.totalAnchors - stats.totalBatchAnchors,
                  ),
                })}
              </span>
              <span>
                {t("stats.batchAnchors", {
                  count: formatNumber(stats.totalBatchAnchors),
                })}
              </span>
              <span>
                {t("stats.registrations", {
                  count: formatNumber(stats.totalRegistrations),
                })}
              </span>
              {stats.firstAnchorBlock > 0 && (
                <span>
                  {t("stats.firstBlock", {
                    count: formatNumber(stats.firstAnchorBlock),
                  })}
                </span>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
