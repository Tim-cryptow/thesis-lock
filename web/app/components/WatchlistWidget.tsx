"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  type WatchItem,
  WATCHLIST_CHANGED_EVENT,
  countWatchUpdates,
  loadWatchlist,
} from "@/lib/watchlist";

const MAX_PREVIEW = 5;

function statusDotClass(item: WatchItem): string {
  const status = item.lastStatus;
  if (!status) return "bg-foreground/30";
  if (item.type === "hash") return status.verified ? "bg-green-500" : "bg-red-500";
  return "bg-blue-500";
}

function statusText(item: WatchItem): string {
  const status = item.lastStatus;
  if (!status) return "not checked";
  if (item.type === "hash") return status.verified ? "verified" : "not found";
  const count = status.anchorCount ?? 0;
  const suffix = (status.newAnchors ?? 0) > 0 ? ` (+${status.newAnchors})` : "";
  return `${count} ${count === 1 ? "anchor" : "anchors"}${suffix}`;
}

function viewHref(item: WatchItem): string {
  if (item.type === "hash") return `/v/${item.value}`;
  if (item.type === "wallet") return `/u/${item.value}`;
  return `/groups/${item.value}`;
}

// Compact, collapsible watchlist summary for the dashboard or a sidebar. Shows
// the watched count and how many items have new updates, with a short preview.
export default function WatchlistWidget() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const sync = () => setItems(loadWatchlist());
    sync();
    window.addEventListener(WATCHLIST_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const updates = countWatchUpdates(items);
  const summary =
    items.length === 0
      ? "No watched items yet"
      : `${items.length} watched ${items.length === 1 ? "item" : "items"}${
          updates > 0
            ? `, ${updates} new ${updates === 1 ? "update" : "updates"}`
            : ""
        }`;

  return (
    <div className="rounded-lg border border-foreground/10 bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-medium">Watchlist</span>
        {updates > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-medium text-white">
            {updates}
          </span>
        )}
        <span className="ml-auto text-xs text-foreground/45">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div className="border-t border-foreground/10 px-4 py-3">
          <p className="text-xs text-foreground/55 mb-3">{summary}</p>
          {items.length === 0 ? (
            <p className="text-xs text-foreground/50">
              Add hashes, wallets, or groups from their pages, then track them
              here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.slice(0, MAX_PREVIEW).map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-xs">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(item)}`}
                  />
                  <Link
                    href={viewHref(item)}
                    className="truncate text-foreground/80 hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                  <span className="ml-auto shrink-0 text-foreground/45">
                    {statusText(item)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/watchlist"
            className="mt-3 inline-block text-xs text-foreground/70 underline hover:text-foreground"
          >
            {items.length > MAX_PREVIEW
              ? `View all ${items.length} watched items`
              : "Open watchlist"}
          </Link>
        </div>
      )}
    </div>
  );
}
