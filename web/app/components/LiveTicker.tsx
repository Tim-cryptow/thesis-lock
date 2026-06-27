"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLive } from "@/app/components/LiveProvider";
import type { LiveEvent } from "@/lib/livePoller";
import { truncateAddress } from "@/lib/wallet";

// Hide the whole bar once the freshest event is older than this.
const STALE_MS = 5 * 60 * 1000;
const COLLAPSED_KEY = "thesislock.live.ticker.collapsed";
const HIDDEN_KEY = "thesislock.live.ticker.hidden";

// Same-tab signal for the show/hide toggle (storage events only fire elsewhere).
export const TICKER_VISIBILITY_EVENT = "thesislock:ticker-visibility-changed";

export function isTickerHidden(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setTickerHidden(hidden: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIDDEN_KEY, hidden ? "1" : "0");
    window.dispatchEvent(new CustomEvent(TICKER_VISIBILITY_EVENT));
  } catch {
    // ignore
  }
}

function relativeTime(ms: number): string {
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function verbFor(ev: LiveEvent): string {
  switch (ev.kind) {
    case "batch":
      return "batch anchored";
    case "group":
      return "anchored to a group";
    case "proof":
      return "minted a proof for";
    default:
      return "anchored";
  }
}

function linkFor(ev: LiveEvent): string {
  if (ev.hash) {
    // Group anchors are keyed by { group-id, index }; link to that exact row.
    // VerifyClient reads ?owner= as a batch selector, so a group event must not
    // fall through to the owner link or it can resolve to an unrelated record.
    if (ev.kind === "group") {
      if (ev.groupId !== null && ev.groupIndex !== null) {
        return `/v/${ev.hash}?group=${ev.groupId}&gi=${ev.groupIndex}`;
      }
      return `/v/${ev.hash}`;
    }
    if (ev.owner && ev.kind !== "anchor") {
      return `/v/${ev.hash}?owner=${encodeURIComponent(ev.owner)}`;
    }
    return `/v/${ev.hash}`;
  }
  if (ev.owner) return `/u/${ev.owner}`;
  return "/feed";
}

function describe(ev: LiveEvent): string {
  const who = ev.owner ? truncateAddress(ev.owner, 4, 5) : "Someone";
  const what = ev.label ? ev.label : ev.hash ? ev.hash.slice(0, 10) : "a document";
  return `${who} ${verbFor(ev)} ${what}`;
}

function TickerItem({ ev }: { ev: LiveEvent }) {
  return (
    <Link
      href={linkFor(ev)}
      className="inline-flex shrink-0 items-center gap-2 px-4 text-xs text-foreground/70 hover:text-foreground transition"
    >
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span className="truncate">{describe(ev)}</span>
      <span className="text-foreground/40">&middot; {relativeTime(ev.receivedAt)}</span>
    </Link>
  );
}

export default function LiveTicker() {
  const { events, status, toggle } = useLive();
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Re-render periodically so relative times and the stale check stay fresh.
  const [, setTick] = useState(0);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  // Honor the show/hide preference from settings, live and across tabs.
  useEffect(() => {
    setHidden(isTickerHidden());
    const sync = () => setHidden(isTickerHidden());
    window.addEventListener("storage", sync);
    window.addEventListener(TICKER_VISIBILITY_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(TICKER_VISIBILITY_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (hidden) return null;
  if (events.length === 0) return null;
  const newest = events[0]!.receivedAt;
  if (Date.now() - newest > STALE_MS) return null;

  const dotClass =
    status === "live"
      ? "bg-emerald-500 live-dot-pulse"
      : status === "error"
        ? "bg-red-500"
        : "bg-foreground/40";

  return (
    <div className="border-b border-foreground/10 bg-card/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-1.5">
        <div className="flex shrink-0 items-center gap-1.5">
          <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
          <span className="text-[10px] uppercase tracking-wide text-foreground/50">Live</span>
        </div>

        {collapsed ? (
          <span className="flex-1 truncate text-xs text-foreground/55">
            {events.length} recent event{events.length === 1 ? "" : "s"}
          </span>
        ) : (
          <div className="relative flex-1 overflow-hidden">
            <div className="live-ticker-track flex w-max items-center whitespace-nowrap">
              {/* Rendered twice for a seamless marquee loop. */}
              {events.map((ev) => (
                <TickerItem key={ev.id} ev={ev} />
              ))}
              {events.map((ev) => (
                <TickerItem key={`dup-${ev.id}`} ev={ev} />
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-foreground/50 hover:text-foreground transition"
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
        <button
          type="button"
          onClick={toggle}
          title={
            status === "paused"
              ? "Live updates are paused. Click to resume."
              : "Pause live updates."
          }
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-foreground/50 hover:text-foreground transition"
        >
          {status === "paused" ? "Resume" : "Pause"}
        </button>
      </div>
    </div>
  );
}
