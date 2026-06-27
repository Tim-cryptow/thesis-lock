"use client";

import { useEffect, useState } from "react";
import type { ProtocolStats } from "@/lib/stats";
import { instrumentedFetch } from "@/lib/fetchInstrumented";
import CountUp from "@/app/components/CountUp";
import { useI18n } from "@/app/components/I18nProvider";

const STATIC_CONTRACTS = 5;

export default function StatsBar() {
  const { t } = useI18n();
  const [stats, setStats] = useState<ProtocolStats | null>(null);

  useEffect(() => {
    let active = true;
    instrumentedFetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ProtocolStats | null) => {
        if (active && data) setStats(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const items = [
    {
      label: t("landing.statsBar.documentsAnchored"),
      value: stats?.totalAnchors ?? 0,
    },
    {
      label: t("landing.statsBar.uniqueWallets"),
      value: stats?.uniqueWallets ?? 0,
    },
    { label: t("landing.statsBar.smartContracts"), value: STATIC_CONTRACTS },
    {
      label: t("landing.statsBar.transactions"),
      value: stats?.totalTransactions ?? 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 rounded-lg border border-foreground/10 bg-card p-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1">
          <CountUp value={item.value} className="text-3xl font-mono text-heading" />
          <span className="text-xs uppercase tracking-wide text-foreground/50">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
