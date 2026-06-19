"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/components/I18nProvider";
import {
  WATCHLIST_CHANGED_EVENT,
  countWatchUpdates,
  loadWatchlist,
} from "@/lib/watchlist";

// Nav-cluster link to the watchlist with a count badge when watched items have
// new updates. Carries the tour target so the onboarding tour can highlight it.
export default function WatchlistNavLink({
  className = "text-foreground/60 hover:text-foreground",
}: {
  className?: string;
}) {
  const { t } = useI18n();
  const [updates, setUpdates] = useState(0);

  useEffect(() => {
    const sync = () => setUpdates(countWatchUpdates(loadWatchlist()));
    sync();
    window.addEventListener(WATCHLIST_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <Link href="/watchlist" data-tour="watchlist-nav" className={className}>
      <span className="relative inline-flex items-center">
        {t("common.nav.watchlist")}
        {updates > 0 && (
          <span
            aria-label={`${updates} new updates`}
            className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-medium text-white"
          >
            {updates}
          </span>
        )}
      </span>
    </Link>
  );
}
