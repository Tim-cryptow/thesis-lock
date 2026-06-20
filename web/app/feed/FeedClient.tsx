"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import CollectionsNavLink from "@/app/components/CollectionsNavLink";
import { useI18n } from "@/app/components/I18nProvider";
import ThemeToggle from "@/app/components/ThemeToggle";
import WatchlistButton from "@/app/components/WatchlistButton";
import AddToCollectionButton from "@/app/components/AddToCollectionButton";
import ErrorFallback from "@/app/components/ErrorFallback";
import LiveBadge from "@/app/components/LiveBadge";
import { useLive } from "@/app/components/LiveProvider";
import type { LiveEvent } from "@/lib/livePoller";
import { fetchRecentAnchors, type FeedEntry } from "@/lib/feed";
import { explorerTxUrl } from "@/lib/stacks";
import { truncateAddress } from "@/lib/wallet";

const PAGE_SIZE = 20;
// Cadence for re-rendering relative timestamps. Fresh data now arrives through
// the live poller rather than a blind full refetch.
const TICK_MS = 60_000;

function entryKey(entry: FeedEntry): string {
  return `${entry.hash}|${entry.owner}|${entry.txId}`;
}

// A live single-anchor event maps directly onto a feed row. The events API
// carries no timestamp, so we stamp it with the moment it was observed.
function liveToFeedEntry(ev: LiveEvent): FeedEntry {
  return {
    hash: ev.hash ?? "",
    label: ev.label ?? "",
    owner: ev.owner ?? "",
    stacksBlock: ev.stacksBlock ?? 0,
    timestamp: new Date(ev.receivedAt).toISOString(),
    txId: ev.txId,
    source: "single",
  };
}

function truncateHash(h: string): string {
  if (h.length <= 14) return h;
  return `${h.slice(0, 8)}...${h.slice(-6)}`;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

function timeAgo(iso: string, t: Translate): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!then) return "";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return t("feed.time.justNow");
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return t(min === 1 ? "feed.time.minute" : "feed.time.minutes", { count: min });
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return t(hr === 1 ? "feed.time.hour" : "feed.time.hours", { count: hr });
  }
  const day = Math.floor(hr / 24);
  if (day < 30) {
    return t(day === 1 ? "feed.time.day" : "feed.time.days", { count: day });
  }
  const mon = Math.floor(day / 30);
  if (mon < 12) return t("feed.time.months", { count: mon });
  return t("feed.time.years", { count: Math.floor(mon / 12) });
}

function verifyLinkFor(entry: FeedEntry): string {
  if (entry.source === "batch") {
    return `/v/${entry.hash}?owner=${encodeURIComponent(entry.owner)}`;
  }
  return `/v/${entry.hash}`;
}

function sourceBadgeClass(source: FeedEntry["source"]): string {
  if (source === "single") {
    return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900";
  }
  if (source === "batch") {
    return "bg-sky-50 text-sky-800 border-sky-200";
  }
  return "bg-foreground/5 text-foreground/70 border-foreground/10";
}

export default function FeedClient() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  // Tick once a minute so relative timestamps update without refetching.
  const [, setTick] = useState(0);
  // Total entries the feed currently asks the API for. Load more grows this
  // and the next fetch returns everything from the top, deeper. Tracking a
  // per-contract offset cursor on the client would skip events from quieter
  // sources when the busy ones surge.
  const [requestedLimit, setRequestedLimit] = useState(PAGE_SIZE);
  // Keys of rows that arrived live and should briefly glow.
  const [glowKeys, setGlowKeys] = useState<Set<string>>(new Set());
  // New anchors prepended while the user is scrolled away from the top.
  const [newBannerCount, setNewBannerCount] = useState(0);
  const { events: liveEvents } = useLive();
  // Live event ids already merged into the feed, so each is handled once.
  const processedRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(
    async (n: number, silent = false) => {
      if (silent) setRefreshing(true);
      setError(null);
      try {
        const fresh = await fetchRecentAnchors(n);
        setEntries(fresh);
        setHasMore(fresh.length >= n);
      } catch {
        setError(t("feed.errors.load"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void refresh(requestedLimit);
  }, [refresh, requestedLimit]);

  // Relative timestamps only; new rows now arrive through the live poller, so
  // there is no blind full refetch on a timer anymore.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Merge live single-anchor events into the feed as they arrive, newest on
  // top, with a brief glow. Batch and registry rows still come from the
  // initial fetch; only single anchors carry a hash in their print event.
  useEffect(() => {
    if (liveEvents.length === 0) return;
    setEntries((prev) => {
      const existing = new Set(prev.map(entryKey));
      const fresh: FeedEntry[] = [];
      for (const ev of liveEvents) {
        if (ev.kind !== "anchor" || !ev.hash) continue;
        if (processedRef.current.has(ev.id)) continue;
        processedRef.current.add(ev.id);
        const entry = liveToFeedEntry(ev);
        const key = entryKey(entry);
        if (existing.has(key)) continue;
        existing.add(key);
        fresh.push(entry);
      }
      if (fresh.length === 0) return prev;

      const keys = fresh.map(entryKey);
      setGlowKeys((g) => {
        const next = new Set(g);
        keys.forEach((k) => next.add(k));
        return next;
      });
      keys.forEach((k) => {
        setTimeout(() => {
          setGlowKeys((g) => {
            const next = new Set(g);
            next.delete(k);
            return next;
          });
        }, 2500);
      });
      if (typeof window !== "undefined" && window.scrollY > 200) {
        setNewBannerCount((c) => c + fresh.length);
      }
      return [...fresh, ...prev];
    });
  }, [liveEvents]);

  // Clear the "new anchors" banner once the user returns to the top.
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY < 100) setNewBannerCount(0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError(null);
    const nextLimit = requestedLimit + PAGE_SIZE;
    try {
      const grown = await fetchRecentAnchors(nextLimit);
      if (grown.length <= entries.length) {
        setHasMore(false);
      } else {
        setEntries(grown);
        setRequestedLimit(nextLimit);
        setHasMore(grown.length >= nextLimit);
      }
    } catch {
      setError(t("feed.errors.loadMore"));
    } finally {
      setLoadingMore(false);
    }
  };

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 1500);
    } catch {
      // ignore
    }
  };

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
        <span className="text-foreground font-medium">{t("common.nav.feed")}</span>
        <Link href="/stats" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.stats")}
        </Link>
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

      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl">{t("feed.title")}</h1>
          <LiveBadge />
        </div>
        {refreshing && (
          <span className="text-xs text-foreground/50">{t("feed.refreshing")}</span>
        )}
      </div>

      {newBannerCount > 0 && (
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setNewBannerCount(0);
          }}
          className="sticky top-3 z-10 mb-4 w-full rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-300 transition hover:opacity-90"
        >
          {newBannerCount} new anchor{newBannerCount === 1 ? "" : "s"} &middot; scroll to top
        </button>
      )}
      <p className="text-foreground/70 mb-8">
        {t("feed.subtitle")}
      </p>

      {error && entries.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {error && entries.length === 0 ? (
        <ErrorFallback
          message={error}
          onRetry={() => void refresh(requestedLimit)}
        />
      ) : loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-foreground/10 bg-card p-5"
            >
              <div className="h-3 w-32 rounded bg-foreground/10 animate-pulse mb-3" />
              <div className="h-3 w-3/4 rounded bg-foreground/10 animate-pulse mb-2" />
              <div className="h-3 w-1/2 rounded bg-foreground/10 animate-pulse" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">
            {t("feed.empty.message")}
          </p>
          <Link
            href="/anchor"
            className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
          >
            {t("feed.empty.cta")}
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entryKey(entry)}
                className={`rounded-lg border border-foreground/10 bg-card p-5 ${
                  glowKeys.has(entryKey(entry)) ? "live-glow" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${sourceBadgeClass(
                          entry.source,
                        )}`}
                      >
                        {t(`feed.source.${entry.source}`)}
                      </span>
                      <span className="text-xs text-foreground/50">
                        {timeAgo(entry.timestamp, t) ||
                          t("feed.block", { block: entry.stacksBlock })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <code className="font-mono text-sm">
                        {truncateHash(entry.hash)}
                      </code>
                      <button
                        onClick={() => void copyHash(entry.hash)}
                        className="text-xs px-2 py-1 rounded border border-foreground/15 hover:border-foreground/40 transition"
                      >
                        {copiedHash === entry.hash
                          ? t("common.actions.copied")
                          : t("common.actions.copy")}
                      </button>
                      <WatchlistButton
                        type="hash"
                        value={entry.hash}
                        owner={
                          entry.source === "batch" ||
                          entry.source === "registry"
                            ? entry.owner
                            : undefined
                        }
                      />
                      <AddToCollectionButton
                        hash={entry.hash}
                        label={entry.label}
                        verifyUrl={verifyLinkFor(entry)}
                      />
                    </div>
                    <div className="text-sm text-foreground/80 mb-2">
                      <span className="text-xs text-foreground/50 mr-2 uppercase tracking-wide">
                        {t("feed.entry.label")}
                      </span>
                      <code className="font-mono text-xs">
                        {entry.label || t("feed.entry.unlabeled")}
                      </code>
                    </div>
                    <div className="text-sm text-foreground/80">
                      <span className="text-xs text-foreground/50 mr-2 uppercase tracking-wide">
                        {t("feed.entry.by")}
                      </span>
                      <Link
                        href={`/u/${entry.owner}`}
                        className="font-mono text-xs underline hover:no-underline"
                      >
                        {truncateAddress(entry.owner, 6, 6)}
                      </Link>
                      <span className="mx-2 text-foreground/30">&middot;</span>
                      <a
                        href={explorerTxUrl(entry.txId)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline hover:no-underline"
                      >
                        {t("feed.entry.tx")}
                      </a>
                      <span className="mx-2 text-foreground/30">&middot;</span>
                      <span className="text-xs text-foreground/60 font-mono">
                        {t("feed.block", { block: entry.stacksBlock })}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={verifyLinkFor(entry)}
                    className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition shrink-0"
                  >
                    {t("feed.entry.verify")}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 text-center">
            {hasMore ? (
              <button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="text-sm px-4 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
              >
                {loadingMore ? t("feed.loadingMore") : t("feed.loadMore")}
              </button>
            ) : (
              <p className="text-xs text-foreground/50">
                {t("feed.endOfFeed")}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
