"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import { useI18n } from "@/app/components/I18nProvider";
import ThemeToggle from "@/app/components/ThemeToggle";
import WatchlistButton from "@/app/components/WatchlistButton";
import ErrorFallback from "@/app/components/ErrorFallback";
import { fetchRecentAnchors, type FeedEntry } from "@/lib/feed";
import { explorerTxUrl } from "@/lib/stacks";
import { truncateAddress } from "@/lib/wallet";

const PAGE_SIZE = 20;
const REFRESH_MS = 60_000;

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

  useEffect(() => {
    const id = setInterval(
      () => void refresh(requestedLimit, true),
      REFRESH_MS,
    );
    return () => clearInterval(id);
  }, [refresh, requestedLimit]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => clearInterval(id);
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
      </div>

      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
        <h1 className="text-3xl">{t("feed.title")}</h1>
        {refreshing && (
          <span className="text-xs text-foreground/50">{t("feed.refreshing")}</span>
        )}
      </div>
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
                key={`${entry.hash}|${entry.owner}|${entry.txId}`}
                className="rounded-lg border border-foreground/10 bg-card p-5"
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
                          entry.source === "batch" ? entry.owner : undefined
                        }
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
