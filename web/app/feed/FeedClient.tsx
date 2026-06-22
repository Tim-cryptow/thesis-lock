"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import CollectionsNavLink from "@/app/components/CollectionsNavLink";
import { useI18n } from "@/app/components/I18nProvider";
import ThemeToggle from "@/app/components/ThemeToggle";
import WatchlistButton from "@/app/components/WatchlistButton";
import AddToCollectionButton from "@/app/components/AddToCollectionButton";
import TagFilter from "@/app/components/TagFilter";
import ErrorFallback from "@/app/components/ErrorFallback";
import HelpText from "@/app/components/HelpText";
import LiveBadge from "@/app/components/LiveBadge";
import { useLive } from "@/app/components/LiveProvider";
import type { LiveEvent } from "@/lib/livePoller";
import { fetchRecentAnchors, type FeedEntry } from "@/lib/feed";
import { explorerTxUrl, readBatchAnchor } from "@/lib/stacks";
import TruncatedHash from "@/app/components/TruncatedHash";
import TruncatedAddress from "@/app/components/TruncatedAddress";
import {
  TAGS_CHANGED_EVENT,
  getHashesByTag,
  normalizeHash,
} from "@/lib/tags";

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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
  // Mirror of the current entries so the live merge can dedupe without
  // depending on the entries state (which would re-run the merge on every
  // prepend).
  const entriesRef = useRef<FeedEntry[]>([]);

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

  // Keep the entries mirror in sync for the live merge's dedupe.
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Merge live events into the feed as they arrive, newest on top, with a brief
  // glow. Single anchors map directly to a row. Batch documents arrive as
  // registry events, so each is validated against the batch map (mirroring
  // fetchRecentAnchors): a single-anchor re-index resolves to none and is
  // dropped, a real batch row resolves and carries the authoritative block.
  useEffect(() => {
    if (liveEvents.length === 0) return;
    let cancelled = false;

    const run = async () => {
      // Stage processed ids locally and commit them only after the cancelled
      // check below, so a poll or unmount mid-validation cannot mark an event
      // processed without prepending its row (which would drop it permanently).
      const processed = new Set<string>();
      const anchorFresh: FeedEntry[] = [];
      const registryEvents: LiveEvent[] = [];
      for (const ev of liveEvents) {
        if (processedRef.current.has(ev.id) || processed.has(ev.id)) continue;
        if (ev.kind === "anchor" && ev.hash) {
          processed.add(ev.id);
          anchorFresh.push(liveToFeedEntry(ev));
        } else if (ev.kind === "registry" && ev.hash && ev.owner) {
          registryEvents.push(ev);
        }
      }

      const validated: FeedEntry[] = [];
      for (const ev of registryEvents) {
        try {
          const batch = await readBatchAnchor(
            ev.hash as string,
            ev.owner as string,
          );
          if (cancelled) return;
          processed.add(ev.id);
          if (batch) {
            validated.push({
              hash: ev.hash as string,
              label: batch.label || ev.label || "",
              owner: ev.owner as string,
              stacksBlock: batch.stacksBlock,
              timestamp: new Date(ev.receivedAt).toISOString(),
              txId: ev.txId,
              source: "batch",
            });
          }
        } catch {
          // Transient lookup failure: leave it unprocessed to retry next poll.
        }
      }

      if (cancelled) return;
      for (const id of processed) processedRef.current.add(id);

      const incoming = [...anchorFresh, ...validated];
      if (incoming.length === 0) return;
      incoming.sort((a, b) => b.stacksBlock - a.stacksBlock);

      const existing = new Set(entriesRef.current.map(entryKey));
      const fresh = incoming.filter((e) => {
        const k = entryKey(e);
        if (existing.has(k)) return false;
        existing.add(k);
        return true;
      });
      if (fresh.length === 0) return;

      const keys = fresh.map(entryKey);
      setEntries((prev) => [...fresh, ...prev]);
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
    };

    void run();
    return () => {
      cancelled = true;
    };
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
      // End-of-feed depends on the fetched page size, not entries.length, which
      // live prepends inflate (and would otherwise hide the button early). A
      // page shorter than requested means there are no older rows left.
      setHasMore(grown.length >= nextLimit);
      setRequestedLimit(nextLimit);
      // Keep any live-prepended rows the fetched page does not yet include on
      // top, so the visible list never shrinks on load more.
      setEntries((prev) => {
        const grownKeys = new Set(grown.map(entryKey));
        const livePrepends = prev.filter((e) => !grownKeys.has(entryKey(e)));
        return [...livePrepends, ...grown];
      });
    } catch {
      setError(t("feed.errors.loadMore"));
    } finally {
      setLoadingMore(false);
    }
  };

  // Refresh when tags change in another tab so the filter reflects the latest.
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(TAGS_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(TAGS_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  // Narrow the feed to entries whose hash carries any selected tag. Union the
  // tagged hashes once per selected tag rather than reading storage per row.
  const matchingHashes =
    selectedTags.length > 0
      ? new Set(selectedTags.flatMap((tag) => getHashesByTag(tag)))
      : null;
  const displayedEntries = matchingHashes
    ? entries.filter((e) => matchingHashes.has(normalizeHash(e.hash)))
    : entries;

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
          <div className="mb-4">
            <TagFilter
              selectedTags={selectedTags}
              onFilterChange={setSelectedTags}
            />
          </div>
          {selectedTags.length > 0 && displayedEntries.length === 0 && (
            <p className="rounded-lg border border-foreground/10 bg-card p-6 text-center text-sm text-foreground/50">
              No feed entries match the selected tags.
            </p>
          )}
          <ul className="space-y-3">
            {displayedEntries.map((entry) => (
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
                      <TruncatedHash hash={entry.hash} />
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
                        <HelpText term="Label" />
                      </span>
                      <code className="font-mono text-xs">
                        {entry.label || t("feed.entry.unlabeled")}
                      </code>
                    </div>
                    <div className="text-sm text-foreground/80">
                      <span className="text-xs text-foreground/50 mr-2 uppercase tracking-wide">
                        {t("feed.entry.by")}
                        <HelpText term="Principal" />
                      </span>
                      <TruncatedAddress address={entry.owner} />
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
