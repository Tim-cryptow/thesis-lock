"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LivePoller, type LiveEvent, type LiveStatus } from "@/lib/livePoller";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME ?? "thesislock";

// Every contract whose events feed the live ticker.
const CONTRACT_NAMES = [
  CONTRACT_NAME,
  "thesislock-batch",
  "thesislock-registry",
  "thesislock-proof",
  "thesislock-groups",
];

// Largest rolling buffer of recent events kept in memory and shared with the UI.
const BUFFER_SIZE = 50;

const PAUSED_KEY = "thesislock.live.paused";
const INTERVAL_KEY = "thesislock.live.interval";

// Allowed polling intervals offered in settings, in milliseconds.
export const LIVE_INTERVALS = [15_000, 30_000, 60_000];

export function getLiveInterval(): number {
  if (typeof window === "undefined") return LIVE_INTERVALS[0]!;
  try {
    const value = Number(window.localStorage.getItem(INTERVAL_KEY));
    return LIVE_INTERVALS.includes(value) ? value : LIVE_INTERVALS[0]!;
  } catch {
    return LIVE_INTERVALS[0]!;
  }
}

export function setLiveInterval(ms: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INTERVAL_KEY, String(ms));
  } catch {
    // Non-fatal if persistence is unavailable.
  }
}

// "live": polling and healthy. "error": last poll failed. "paused": user
// disabled live updates.
export type LiveConnectionStatus = "live" | "error" | "paused";

type LiveContextValue = {
  events: LiveEvent[];
  status: LiveConnectionStatus;
  isLive: boolean;
  lastUpdate: number | null;
  // New events observed since the consumer last called markSeen().
  newEventCount: number;
  paused: boolean;
  pause: () => void;
  resume: () => void;
  toggle: () => void;
  markSeen: () => void;
};

const LiveContext = createContext<LiveContextValue | null>(null);

function readPaused(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PAUSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writePaused(paused: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PAUSED_KEY, paused ? "1" : "0");
  } catch {
    // localStorage may be unavailable; non-fatal.
  }
}

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [pollStatus, setPollStatus] = useState<LiveStatus>("ok");
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [newEventCount, setNewEventCount] = useState(0);
  const [paused, setPaused] = useState(false);

  const pollerRef = useRef<LivePoller | null>(null);

  const handleNewEvents = useCallback((incoming: LiveEvent[]) => {
    if (incoming.length === 0) return;
    setEvents((prev) => {
      // incoming is oldest-first; newest-first for the buffer.
      const seen = new Set(prev.map((e) => e.id));
      const merged = [...prev];
      for (const ev of incoming) {
        if (!seen.has(ev.id)) {
          merged.unshift(ev);
          seen.add(ev.id);
        }
      }
      return merged.slice(0, BUFFER_SIZE);
    });
    setNewEventCount((n) => n + incoming.length);
    setLastUpdate(Date.now());
  }, []);

  // Initialize from the saved preference on mount (client only).
  useEffect(() => {
    setPaused(readPaused());
  }, []);

  // Create the poller once.
  if (pollerRef.current === null) {
    pollerRef.current = new LivePoller({
      contractAddresses: CONTRACT_NAMES.map((name) => `${CONTRACT_ADDRESS}.${name}`),
      interval: getLiveInterval(),
      onNewEvents: handleNewEvents,
      onStatusChange: (s) => setPollStatus(s),
    });
  }

  // Start or stop polling to match the paused preference.
  useEffect(() => {
    const poller = pollerRef.current;
    if (!poller) return;
    if (paused) {
      poller.stop();
    } else {
      poller.start();
    }
    return () => {
      poller.stop();
    };
  }, [paused]);

  const pause = useCallback(() => {
    setPaused(true);
    writePaused(true);
  }, []);

  const resume = useCallback(() => {
    setPaused(false);
    writePaused(false);
  }, []);

  const toggle = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      writePaused(next);
      return next;
    });
  }, []);

  const markSeen = useCallback(() => {
    setNewEventCount(0);
  }, []);

  const status: LiveConnectionStatus = paused
    ? "paused"
    : pollStatus === "error"
      ? "error"
      : "live";

  const value = useMemo<LiveContextValue>(
    () => ({
      events,
      status,
      isLive: status === "live",
      lastUpdate,
      newEventCount,
      paused,
      pause,
      resume,
      toggle,
      markSeen,
    }),
    [events, status, lastUpdate, newEventCount, paused, pause, resume, toggle, markSeen],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): LiveContextValue {
  const ctx = useContext(LiveContext);
  if (!ctx) {
    throw new Error("useLive must be used within a LiveProvider");
  }
  return ctx;
}
