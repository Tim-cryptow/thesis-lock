"use client";

import { useEffect, useRef, useState } from "react";
import type { ProtocolStats } from "@/lib/stats";

const DURATION_MS = 1000;

function AnimatedNumber({ value, active }: { value: number; active: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      if (start === null) start = now;
      const progress = Math.min((now - start) / DURATION_MS, 1);
      // Ease-out so the count decelerates into its final value.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, active]);

  return <>{display.toLocaleString("en-US")}</>;
}

const STATIC_CONTRACTS = 5;

export default function StatsBar() {
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ProtocolStats | null) => {
        if (active && data) setStats(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const items = [
    { label: "Documents anchored", value: stats?.totalAnchors ?? 0 },
    { label: "Unique wallets", value: stats?.uniqueWallets ?? 0 },
    { label: "Smart contracts", value: STATIC_CONTRACTS },
    { label: "Transactions", value: stats?.totalTransactions ?? 0 },
  ];

  // Counters only run once the data is present and the bar is on screen, so
  // the numbers animate to real totals rather than racing up to a stale zero.
  const animate = visible && stats !== null;

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 lg:grid-cols-4 gap-6 rounded-lg border border-foreground/10 bg-card p-6"
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <span className="text-3xl font-mono text-heading">
            <AnimatedNumber value={item.value} active={animate} />
          </span>
          <span className="text-xs uppercase tracking-wide text-foreground/50">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
