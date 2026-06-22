"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearHistory,
  getRecentPages,
  type RecentPage,
} from "@/lib/navigationHistory";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function truncatePath(path: string): string {
  return path.length > 32 ? `${path.slice(0, 29)}...` : path;
}

// Fixed clock button mounted once in the root layout, to the left of the
// settings gear, so the recently visited pages are reachable from anywhere
// without a shared nav bar.
export default function RecentPages() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState<RecentPage[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // sessionStorage is not reactive, so refresh the list each time the menu
  // opens rather than holding a stale snapshot.
  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) setPages(getRecentPages().slice(0, 10));
      return !wasOpen;
    });
  };

  // Close on outside click or Escape, matching the notification dropdown.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const onClear = () => {
    clearHistory();
    setPages([]);
  };

  return (
    <div ref={rootRef} className="fixed right-[6.25rem] top-2 z-40">
      <button
        type="button"
        onClick={toggle}
        aria-label="Recently visited pages"
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-card text-foreground/70 shadow-sm transition hover:border-foreground/30 hover:text-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-foreground/15 bg-card shadow-lg">
          <div className="border-b border-foreground/10 px-4 py-2.5">
            <span className="text-sm font-medium text-foreground">
              Recently visited
            </span>
          </div>

          {pages.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-foreground/55">
              No pages visited yet
            </div>
          ) : (
            <>
              <ul className="max-h-80 overflow-y-auto">
                {pages.map((page) => (
                  <li key={`${page.path}-${page.visitedAt}`}>
                    <button
                      type="button"
                      onClick={() => go(page.path)}
                      className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-foreground/[0.03]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground/90">
                          {page.title}
                        </span>
                        <span className="block truncate font-mono text-xs text-foreground/50">
                          {truncatePath(page.path)}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-foreground/40">
                        {relativeTime(page.visitedAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onClear}
                className="block w-full border-t border-foreground/10 px-4 py-2.5 text-center text-sm text-foreground/60 transition hover:text-foreground"
              >
                Clear history
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
