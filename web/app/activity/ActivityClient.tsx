"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import CollectionsNavLink from "@/app/components/CollectionsNavLink";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";
import { useWallet } from "@/lib/wallet";
import TruncatedAddress from "@/app/components/TruncatedAddress";
import { explorerTxUrl } from "@/lib/stacks";
import { instrumentedFetch } from "@/lib/fetchInstrumented";
import {
  activityCategory,
  type ActivityCategory,
  type ActivityEvent,
} from "@/lib/activityLog";
import { describeActivity } from "@/lib/activityDescriptions";

const PAGE_SIZE = 20;

type Filter = "all" | ActivityCategory;

const FILTERS: Filter[] = ["all", "anchors", "groups", "proofs", "registry"];

const LOCALE_TAGS: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};

// Tailwind classes for the icon badge, keyed by the broad activity category, so
// anchors read blue, groups purple, proofs gold, and registry gray.
const CATEGORY_BADGE: Record<ActivityCategory, string> = {
  anchors: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  groups: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  proofs: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  registry: "bg-foreground/10 text-foreground/60",
};

function relativeTime(
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

function dayKey(iso: string): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// "Today" / "Yesterday" / a localized "June 7" (with year when not the current
// year), used for the timeline date separators.
function dayLabel(
  iso: string,
  t: (key: string, params?: Record<string, string | number>) => string,
  localeTag: string,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const today = dayKey(now.toISOString());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const key = dayKey(iso);
  if (key === today) return t("activity.date.today");
  if (key === dayKey(yesterdayDate.toISOString())) {
    return t("activity.date.yesterday");
  }
  return d.toLocaleDateString(localeTag, {
    month: "long",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

type DayGroup = { key: string; label: string; events: ActivityEvent[] };

// Bucket the already newest-first events into contiguous day groups.
function groupByDay(
  events: ActivityEvent[],
  t: (key: string, params?: Record<string, string | number>) => string,
  localeTag: string,
): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const event of events) {
    const key = dayKey(event.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.events.push(event);
    } else {
      groups.push({
        key,
        label: dayLabel(event.timestamp, t, localeTag),
        events: [event],
      });
    }
  }
  return groups;
}

function EventRow({
  event,
  t,
}: {
  event: ActivityEvent;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { title, subtitle, icon } = describeActivity(event);
  const badge = CATEGORY_BADGE[activityCategory(event.type)];
  return (
    <li className="flex gap-3 py-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${badge}`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-foreground/90">{title}</span>
          <span className="text-xs text-foreground/50 shrink-0">
            {relativeTime(event.timestamp, t)}
          </span>
        </div>
        {subtitle && (
          <div className="text-xs text-foreground/50 font-mono truncate">
            {subtitle}
          </div>
        )}
        <a
          href={explorerTxUrl(event.txId)}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-foreground/50 underline hover:no-underline"
        >
          {t("activity.viewTx")}
        </a>
      </div>
    </li>
  );
}

export default function ActivityClient() {
  const { t, locale } = useI18n();
  const localeTag = LOCALE_TAGS[locale] ?? "en-US";
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [hasMore, setHasMore] = useState(false);

  // The next raw page to request. Kept in a ref so the scroll observer reads the
  // current value without re-subscribing on every page increment.
  const pageRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // The wallet whose load is current. An in-flight request whose owner no longer
  // matches is stale (the wallet changed mid-flight) and must not commit, so its
  // response can't overwrite the new wallet's timeline.
  const requestOwnerRef = useRef<string | null>(null);

  const fetchPage = useCallback(async (owner: string, page: number) => {
    const res = await instrumentedFetch(
      `/api/activity?address=${encodeURIComponent(owner)}&page=${page}&limit=${PAGE_SIZE}`,
    );
    if (!res.ok) throw new Error(`activity fetch failed: ${res.status}`);
    return (await res.json()) as { events: ActivityEvent[]; hasMore: boolean };
  }, []);

  const loadInitial = useCallback(
    async (owner: string) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPage(owner, 0);
        if (requestOwnerRef.current !== owner) return;
        setEvents(data.events);
        setHasMore(data.hasMore);
        pageRef.current = 1;
      } catch {
        if (requestOwnerRef.current !== owner) return;
        setError(t("activity.loadError"));
        setHasMore(false);
      } finally {
        if (requestOwnerRef.current === owner) setLoading(false);
      }
    },
    [fetchPage, t],
  );

  const loadMore = useCallback(
    async (owner: string) => {
      setLoadingMore(true);
      try {
        const page = pageRef.current;
        const data = await fetchPage(owner, page);
        if (requestOwnerRef.current !== owner) return;
        // Pages are taken over the raw transaction stream, so dedupe by id in
        // case a record straddles a page boundary.
        setEvents((prev) => {
          const seen = new Set(prev.map((e) => e.id));
          return [...prev, ...data.events.filter((e) => !seen.has(e.id))];
        });
        setHasMore(data.hasMore);
        pageRef.current = page + 1;
      } catch {
        if (requestOwnerRef.current !== owner) return;
        setHasMore(false);
      } finally {
        if (requestOwnerRef.current === owner) setLoadingMore(false);
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    // Reset on every wallet change so the new wallet starts from a clean
    // timeline rather than briefly showing the previous wallet's events.
    setEvents([]);
    setHasMore(false);
    setLoadingMore(false);
    setError(null);
    pageRef.current = 0;
    if (!address) {
      requestOwnerRef.current = null;
      setLoading(false);
      return;
    }
    requestOwnerRef.current = address;
    void loadInitial(address);
  }, [address, loadInitial]);

  // Load the next page when the sentinel scrolls into view. Re-subscribing on
  // hasMore/loading changes means a still-visible sentinel keeps paging until
  // the stream is exhausted.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !address) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          void loadMore(address);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [address, hasMore, loading, loadingMore, loadMore]);

  // Filtering is client-side over the loaded events, so switching pills is
  // instant and never refetches.
  const visibleEvents =
    filter === "all"
      ? events
      : events.filter((e) => activityCategory(e.type) === filter);
  const groups = groupByDay(visibleEvents, t, localeTag);

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
            href="/dashboard"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.dashboard")}
          </Link>
          <span className="text-foreground font-medium">
            {t("common.nav.activity")}
          </span>
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
        {address ? (
          <button
            onClick={disconnectWallet}
            className="text-sm font-mono px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            title={t("common.wallet.disconnect")}
          >
            <TruncatedAddress
              address={address}
              linkToProfile={false}
              copyable={false}
            />
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

      <h1 className="text-3xl mb-2">{t("activity.title")}</h1>
      <p className="text-foreground/70 mb-8">{t("activity.subtitle")}</p>

      {!address ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">
            {t("activity.connectPrompt")}
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
        <div className="rounded-lg border border-foreground/10 bg-card p-6">
          <p className="text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
          <button
            onClick={() => void loadInitial(address)}
            className="mt-3 text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
          >
            {t("common.actions.tryAgain")}
          </button>
        </div>
      ) : events.length === 0 && (loading || hasMore) ? (
        // Either the first load is in flight, or page 0 held no ThesisLock
        // calls but more raw transactions remain. Keep the sentinel mounted so
        // the observer pages forward until events appear or the stream ends,
        // instead of prematurely showing the empty state.
        <>
          <p className="text-foreground/60">{t("anchors.loading")}</p>
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        </>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">{t("activity.empty")}</p>
          <Link
            href="/anchor"
            className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
          >
            {t("activity.emptyCta")}
          </Link>
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-label={t("activity.title")}
            className="flex flex-wrap gap-2 mb-6"
          >
            {FILTERS.map((f) => {
              const active = f === filter;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition ${
                    active
                      ? "bg-heading text-background border-transparent"
                      : "border-foreground/15 text-foreground/70 hover:border-foreground/40"
                  }`}
                >
                  {t(`activity.filters.${f}`)}
                </button>
              );
            })}
          </div>

          {visibleEvents.length === 0 ? (
            <p className="text-sm text-foreground/60">{t("activity.empty")}</p>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.key}>
                  <h2 className="text-xs uppercase tracking-wide text-foreground/50 mb-1 sticky top-0 bg-background/80 backdrop-blur py-1">
                    {group.label}
                  </h2>
                  <ul className="divide-y divide-foreground/10 border-l-2 border-foreground/10 pl-4">
                    {group.events.map((event) => (
                      <EventRow key={event.id} event={event} t={t} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
          {loadingMore && (
            <p className="mt-4 text-center text-sm text-foreground/60">
              {t("activity.loadingMore")}
            </p>
          )}
          {!hasMore && events.length > 0 && (
            <p className="mt-6 text-center text-xs text-foreground/40">
              {t("activity.noMore")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
