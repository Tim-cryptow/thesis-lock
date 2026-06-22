"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import CollectionsNavLink from "@/app/components/CollectionsNavLink";
import ThemeToggle from "@/app/components/ThemeToggle";
import ErrorFallback from "@/app/components/ErrorFallback";
import HelpText from "@/app/components/HelpText";
import LiveBadge from "@/app/components/LiveBadge";
import ShareButtons from "@/app/components/ShareButtons";
import { useLive } from "@/app/components/LiveProvider";
import { useI18n } from "@/app/components/I18nProvider";
import { explorerAddressUrl, readBatchAnchor } from "@/lib/stacks";
import type { ProtocolStats } from "@/lib/stats";
import { instrumentedFetch } from "@/lib/fetchInstrumented";

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

function StatCard({
  label,
  value,
  bumpKey,
  term,
}: {
  label: string;
  value: string;
  // Changing this value retriggers a brief tick-up flash on the number.
  bumpKey?: number;
  // Optional glossary term explained by an info tooltip next to the label.
  term?: string;
}) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-6">
      <div className="text-xs uppercase tracking-wide text-foreground/50 mb-2">
        {label}
        {term ? <HelpText term={term} /> : null}
      </div>
      <div className="text-3xl font-mono">
        <span key={bumpKey} className={bumpKey ? "live-bump inline-block" : ""}>
          {value}
        </span>
      </div>
    </div>
  );
}

export default function StatsClient() {
  const { t } = useI18n();
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  // Anchors observed live since this page loaded, layered on top of the
  // fetched totals so the numbers move without a refetch.
  const [liveAnchors, setLiveAnchors] = useState(0);
  const { events: liveEvents } = useLive();
  // Live event ids already inspected.
  const processedRef = useRef<Set<string>>(new Set());
  // hash|owner of documents already counted, so each is counted once.
  const countedRef = useRef<Set<string>>(new Set());
  // Guards a one-time baseline so the buffer that already exists when this page
  // mounts is not counted as new (it may already be in the fetched totals).
  const seededRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await instrumentedFetch("/api/stats");
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

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  // Count newly anchored documents as they stream in from the live poller.
  // A single anchor emits both an anchor and a follow-up registry event for the
  // same hash, and batch documents arrive only as registry events. Count anchor
  // events directly and validate registry events against the batch contract,
  // deduped by hash|owner, so each document counts once and matches how
  // /api/stats derives totalAnchors (single anchors plus batch rows, bare
  // registry calls excluded).
  useEffect(() => {
    // First run after mount sets the baseline. LiveProvider is global, so its
    // buffer can already hold anchors observed on other pages that the
    // /api/stats fetch started on mount may already include. Record everything
    // present now without counting it, and only count events that arrive after.
    if (!seededRef.current) {
      seededRef.current = true;
      for (const ev of liveEvents) {
        processedRef.current.add(ev.id);
        if ((ev.kind === "anchor" || ev.kind === "registry") && ev.hash) {
          countedRef.current.add(`${ev.hash}|${ev.owner ?? ""}`);
        }
      }
      return;
    }

    let cancelled = false;
    const run = async () => {
      // Stage mutations locally and commit only if this run is still current,
      // so a poll arriving mid-validation cannot double-count or strand a key.
      const processed = new Set<string>();
      const counted = new Set(countedRef.current);
      let added = 0;
      for (const ev of liveEvents) {
        if (processedRef.current.has(ev.id) || processed.has(ev.id)) continue;
        const hash = ev.hash;
        if (!hash) continue;
        const key = `${hash}|${ev.owner ?? ""}`;
        if (ev.kind === "anchor") {
          // A single anchor counts directly, deduped by hash|owner.
          processed.add(ev.id);
          if (!counted.has(key)) {
            counted.add(key);
            added += 1;
          }
        } else if (ev.kind === "registry" && ev.owner) {
          // A registry print counts only once it resolves to a real batch row.
          // /api/stats excludes bare registry calls, and a single anchor's
          // follow-up registry is already counted via its anchor event, so
          // validate against the batch contract (as the feed does) to avoid
          // inflating on a standalone register-anchor call.
          if (counted.has(key)) {
            processed.add(ev.id);
            continue;
          }
          try {
            const batch = await readBatchAnchor(hash, ev.owner);
            if (cancelled) return;
            processed.add(ev.id);
            if (batch) {
              counted.add(key);
              added += 1;
            }
          } catch {
            // Transient failure: leave unprocessed to retry on the next poll.
          }
        }
      }
      if (cancelled) return;
      for (const id of processed) processedRef.current.add(id);
      countedRef.current = counted;
      if (added > 0) setLiveAnchors((n) => n + added);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [liveEvents]);

  const totalAnchors = (stats?.totalAnchors ?? 0) + liveAnchors;
  // Layer live anchors onto the activity chart. /api/stats only returns days
  // that already have activity, so the last bucket may be an earlier day (or
  // there may be none yet). Grow today's bucket if it exists, otherwise append
  // one, so live anchors always land on the correct UTC day instead of an older
  // bar or vanishing while the total counter climbs.
  const todayIso = new Date().toISOString().slice(0, 10);
  const anchorsByDay = (() => {
    if (!stats) return [];
    const days = stats.anchorsByDay;
    if (liveAnchors === 0) return days;
    const last = days[days.length - 1];
    if (last && last.date === todayIso) {
      return days.map((d, i) =>
        i === days.length - 1 ? { ...d, count: d.count + liveAnchors } : d,
      );
    }
    return [...days, { date: todayIso, count: liveAnchors }];
  })();

  const maxDayCount = anchorsByDay.reduce(
    (max, d) => Math.max(max, d.count),
    0,
  );

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

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-3xl">{t("stats.title")}</h1>
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground/50">
          Updated live
          <LiveBadge showText={false} />
        </span>
      </div>
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
              term="Anchor"
              value={formatNumber(totalAnchors)}
              bumpKey={liveAnchors}
            />
            <StatCard
              label={t("stats.uniqueWallets")}
              term="Principal"
              value={formatNumber(stats.uniqueWallets)}
            />
            <StatCard
              label={t("stats.contractsDeployed")}
              value={formatNumber(stats.contractsDeployed)}
            />
            <StatCard
              label={t("stats.latestBlock")}
              term="Stacks Block"
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
            {anchorsByDay.length === 0 ? (
              <p className="text-sm text-foreground/60">{t("stats.noActivity")}</p>
            ) : (
              <div
                className="flex items-end gap-1 h-40"
                role="img"
                aria-label={t("stats.chartAria")}
              >
                {anchorsByDay.map((d) => {
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
            {anchorsByDay.length > 0 && (
              <div className="flex justify-between text-[10px] text-foreground/40 mt-2">
                <span>{formatDateLabel(anchorsByDay[0].date)}</span>
                <span>
                  {formatDateLabel(anchorsByDay[anchorsByDay.length - 1].date)}
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

          <div className="mt-10">
            <ShareButtons
              url={origin ? `${origin}/stats` : ""}
              title="ThesisLock protocol stats"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
