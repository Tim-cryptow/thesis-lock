"use client";

import { useState } from "react";
import type { HttpMethod } from "./endpoints";

const STORAGE_KEY = "thesislock.playground.history";
const MAX_ENTRIES = 15;

export type HistoryEntry = {
  // Millisecond timestamp, also used as the row key.
  timestamp: number;
  method: HttpMethod;
  endpointId: string;
  // Full request path with query string, e.g. "/api/verify/abc?owner=SP...".
  path: string;
  status: number;
  // The parameter values that produced the request, used to re-populate the
  // form on replay.
  values: Record<string, string>;
};

// sessionStorage is read defensively: it is unavailable during SSR and can
// throw in private-mode browsers, so every access is guarded.
export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

// Prepends an entry and keeps only the most recent MAX_ENTRIES. Returns the new
// list so callers can update state without a second read.
export function pushHistory(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory()].slice(0, MAX_ENTRIES);
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Persistence is best-effort; the in-memory list is still returned.
  }
  return next;
}

export function clearHistory(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function statusDotColor(status: number): string {
  if (status >= 500) return "bg-red-500";
  if (status >= 400) return "bg-amber-500";
  if (status >= 200 && status < 300) return "bg-emerald-500";
  return "bg-foreground/40";
}

function formatTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return "";
  }
}

// Shows the query portion of a path, truncated, so the row hints at the
// parameters without overflowing.
function truncateParams(path: string): string {
  const query = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  if (!query) return "";
  return query.length > 48 ? `${query.slice(0, 48)}...` : query;
}

type Props = {
  history: HistoryEntry[];
  onReplay: (entry: HistoryEntry) => void;
  onClear: () => void;
};

export default function RequestHistory({
  history,
  onReplay,
  onClear,
}: Props) {
  const [open, setOpen] = useState(true);

  return (
    <section className="mt-2 border-t border-foreground/10 pt-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-foreground/40 hover:text-foreground/70"
        >
          <span aria-hidden="true">{open ? "▾" : "▸"}</span>
          History ({history.length})
        </button>
        {history.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-foreground/50 hover:text-foreground"
          >
            Clear history
          </button>
        ) : null}
      </div>

      {open ? (
        history.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/50">
            No requests yet this session.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {history.map((entry) => (
              <li key={entry.timestamp}>
                <button
                  type="button"
                  onClick={() => onReplay(entry)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-foreground/5"
                  title="Re-populate the form and send again"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${statusDotColor(
                      entry.status,
                    )}`}
                    aria-hidden="true"
                  />
                  <span className="w-10 shrink-0 font-mono text-foreground/60">
                    {entry.method}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-foreground">
                    {entry.path.split("?")[0]}
                    <span className="text-foreground/40">
                      {truncateParams(entry.path)}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-foreground/60">
                    {entry.status}
                  </span>
                  <span className="hidden shrink-0 text-foreground/40 sm:inline">
                    {formatTime(entry.timestamp)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
