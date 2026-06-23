"use client";

import { useEffect, useState } from "react";
import type { ProtocolStats } from "@/lib/stats";

// Cached at module scope so the footer fetches protocol stats once per session
// and reuses the result across client-side navigations rather than refetching
// on every page.
let cached: ProtocolStats | null = null;
let inflight: Promise<ProtocolStats | null> | null = null;

function loadStats(): Promise<ProtocolStats | null> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetch("/api/stats")
    .then((res) => (res.ok ? (res.json() as Promise<ProtocolStats>) : null))
    .then((data) => {
      if (data) cached = data;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const STATIC_CONTRACTS = 5;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export default function FooterStats() {
  const [stats, setStats] = useState<ProtocolStats | null>(cached);

  useEffect(() => {
    let active = true;
    void loadStats().then((data) => {
      if (active && data) setStats(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <p className="text-xs text-foreground/45" aria-live="polite">
      {stats
        ? `${fmt(stats.totalAnchors)} documents anchored · ${STATIC_CONTRACTS} contracts · ${fmt(stats.uniqueWallets)} wallets`
        : "Loading protocol stats..."}
    </p>
  );
}
