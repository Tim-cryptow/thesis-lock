"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type WatchType,
  WATCHLIST_CHANGED_EVENT,
  addWatch,
  isWatched,
  removeWatchByValue,
} from "@/lib/watchlist";
import { useConfirm } from "@/app/components/useConfirm";

// Optional source keys for hash watches so a batch ({hash, owner}) or group
// ({group-id, index}) anchor can be resolved and linked, not just probed by
// the bare hash.

// A compact toggle for adding the given hash, wallet, or group to the
// watchlist. Reusable inline next to hashes and addresses across the app. Shows
// a hollow bookmark when not watched and a filled one when watched; adding pops
// a brief confirmation, removing asks first.
export default function WatchlistButton({
  type,
  value,
  label,
  owner,
  groupId,
  groupIndex,
  showLabel = false,
  className = "",
}: {
  type: WatchType;
  value: string;
  label?: string;
  owner?: string;
  groupId?: number;
  groupIndex?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const [watched, setWatched] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const confirm = useConfirm();

  // Reflect the stored state, and keep in sync with changes from elsewhere.
  useEffect(() => {
    const sync = () => setWatched(isWatched(type, value));
    sync();
    window.addEventListener(WATCHLIST_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [type, value]);

  const flashToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }, []);

  const toggle = useCallback(async () => {
    if (watched) {
      const shown = label?.trim() || value;
      const short = shown.length > 28 ? `${shown.slice(0, 14)}...${shown.slice(-8)}` : shown;
      const ok = await confirm({
        title: "Remove from watchlist",
        message: `Stop watching ${short}?`,
        confirmLabel: "Remove",
        variant: "warning",
      });
      if (!ok) return;
      removeWatchByValue(type, value);
      setWatched(false);
      flashToast("Removed from watchlist");
    } else {
      addWatch(type, value, label, { owner, groupId, groupIndex });
      setWatched(true);
      flashToast("Added to watchlist");
    }
  }, [watched, type, value, label, owner, groupId, groupIndex, flashToast, confirm]);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={watched}
        aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
        title={watched ? "Watching. Click to remove." : "Add to watchlist"}
        className={`inline-flex items-center gap-1.5 rounded border border-foreground/15 px-2 py-1 text-xs transition hover:border-foreground/40 ${
          watched ? "text-heading" : "text-foreground/60"
        } ${className}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={watched ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {showLabel && <span>{watched ? "Watching" : "Watch"}</span>}
      </button>
      {toast && (
        <span
          role="status"
          className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded border border-foreground/15 bg-card px-2 py-1 text-[10px] text-foreground/80 shadow"
        >
          {toast}
        </span>
      )}
    </span>
  );
}
