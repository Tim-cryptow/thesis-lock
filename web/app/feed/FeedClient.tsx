"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchRecentAnchors, type FeedEntry } from "@/lib/feed";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/stacks";
import { truncateAddress } from "@/lib/wallet";

const PAGE_SIZE = 20;
const REFRESH_MS = 60_000;

function truncateHash(h: string): string {
  if (h.length <= 14) return h;
  return `${h.slice(0, 8)}...${h.slice(-6)}`;
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!then) return "";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon} mo ago`;
  return `${Math.floor(mon / 12)} yr ago`;
}

function verifyLinkFor(entry: FeedEntry): string {
  if (entry.source === "batch") {
    return `/v/${entry.hash}?owner=${encodeURIComponent(entry.owner)}`;
  }
  return `/v/${entry.hash}`;
}

function sourceBadgeClass(source: FeedEntry["source"]): string {
  if (source === "single") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (source === "batch") {
    return "bg-sky-50 text-sky-800 border-sky-200";
  }
  return "bg-foreground/5 text-foreground/70 border-foreground/10";
}

export default function FeedClient() {
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
        setError("Could not load the feed. Try again in a moment.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
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
      setError("Could not load more entries. Try again in a moment.");
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
    <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          &larr; ThesisLock
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
        <span className="text-foreground font-medium">Feed</span>
      </div>

      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
        <h1 className="text-3xl">Recent anchors</h1>
        {refreshing && (
          <span className="text-xs text-foreground/50">Refreshing...</span>
        )}
      </div>
      <p className="text-foreground/70 mb-8">
        Recent on-chain anchor activity from any wallet. Auto-refreshes every
        minute.
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-foreground/10 bg-white p-5"
            >
              <div className="h-3 w-32 rounded bg-foreground/10 animate-pulse mb-3" />
              <div className="h-3 w-3/4 rounded bg-foreground/10 animate-pulse mb-2" />
              <div className="h-3 w-1/2 rounded bg-foreground/10 animate-pulse" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-lg border border-foreground/10 bg-white p-10 text-center">
          <p className="text-foreground/70 mb-6">
            No anchors found yet. Be the first &mdash; anchor a document.
          </p>
          <Link
            href="/anchor"
            className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
          >
            Anchor a document
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={`${entry.hash}|${entry.owner}|${entry.txId}`}
                className="rounded-lg border border-foreground/10 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${sourceBadgeClass(
                          entry.source,
                        )}`}
                      >
                        {entry.source}
                      </span>
                      <span className="text-xs text-foreground/50">
                        {timeAgo(entry.timestamp) ||
                          `block ${entry.stacksBlock}`}
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
                        {copiedHash === entry.hash ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="text-sm text-foreground/80 mb-2">
                      <span className="text-xs text-foreground/50 mr-2 uppercase tracking-wide">
                        Label
                      </span>
                      <code className="font-mono text-xs">
                        {entry.label || "(unlabeled)"}
                      </code>
                    </div>
                    <div className="text-sm text-foreground/80">
                      <span className="text-xs text-foreground/50 mr-2 uppercase tracking-wide">
                        By
                      </span>
                      <a
                        href={explorerAddressUrl(entry.owner)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs underline hover:no-underline"
                      >
                        {truncateAddress(entry.owner, 6, 6)}
                      </a>
                      <span className="mx-2 text-foreground/30">&middot;</span>
                      <a
                        href={explorerTxUrl(entry.txId)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline hover:no-underline"
                      >
                        tx
                      </a>
                      <span className="mx-2 text-foreground/30">&middot;</span>
                      <span className="text-xs text-foreground/60 font-mono">
                        block {entry.stacksBlock}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={verifyLinkFor(entry)}
                    className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition shrink-0"
                  >
                    Verify &rarr;
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
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            ) : (
              <p className="text-xs text-foreground/50">
                End of feed.
              </p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
