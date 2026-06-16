"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";
import { truncateAddress, useWallet } from "@/lib/wallet";
import { explorerTxUrl } from "@/lib/stacks";
import {
  activityCategory,
  type ActivityCategory,
  type ActivityEvent,
} from "@/lib/activityLog";
import { describeActivity } from "@/lib/activityDescriptions";

const PAGE_SIZE = 20;

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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (owner: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/activity?address=${encodeURIComponent(owner)}&page=0&limit=${PAGE_SIZE}`,
        );
        if (!res.ok) throw new Error(`activity fetch failed: ${res.status}`);
        const data = (await res.json()) as { events: ActivityEvent[] };
        setEvents(data.events);
      } catch {
        setError(t("activity.loadError"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!address) {
      setEvents([]);
      return;
    }
    void load(address);
  }, [address, load]);

  const groups = groupByDay(events, t, localeTag);

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
          <Link
            href="/dashboard"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.dashboard")}
          </Link>
          <span className="text-foreground font-medium">
            {t("common.nav.activity")}
          </span>
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
            onClick={() => void load(address)}
            className="mt-3 text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
          >
            {t("common.actions.tryAgain")}
          </button>
        </div>
      ) : loading && events.length === 0 ? (
        <p className="text-foreground/60">{t("anchors.loading")}</p>
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
    </div>
  );
}
