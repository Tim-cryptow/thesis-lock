"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { explorerAddressUrl } from "@/lib/stacks";
import type { ProtocolStats } from "@/lib/stats";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ??
  "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";

const CONTRACTS = [
  { name: "thesislock", label: "Single anchor" },
  { name: "thesislock-batch", label: "Batch anchor" },
  { name: "thesislock-registry", label: "Registry" },
];

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-white p-6">
      <div className="text-xs uppercase tracking-wide text-foreground/50 mb-2">
        {label}
      </div>
      <div className="text-3xl font-mono">{value}</div>
    </div>
  );
}

export default function StatsClient() {
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) throw new Error(`stats fetch failed: ${res.status}`);
        const data = (await res.json()) as ProtocolStats;
        if (active) setStats(data);
      } catch {
        if (active) setError("Could not load protocol stats. Try again soon.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const maxDayCount = stats
    ? stats.anchorsByDay.reduce((max, d) => Math.max(max, d.count), 0)
    : 0;

  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          &larr; ThesisLock
        </Link>
        <Link
          href="/anchor"
          className="text-foreground/60 hover:text-foreground"
        >
          Anchor
        </Link>
        <Link
          href="/anchors"
          className="text-foreground/60 hover:text-foreground"
        >
          My Anchors
        </Link>
        <Link href="/feed" className="text-foreground/60 hover:text-foreground">
          Feed
        </Link>
        <span className="text-foreground font-medium">Stats</span>
      </div>

      <h1 className="text-3xl mb-2">Protocol stats</h1>
      <p className="text-foreground/70 mb-8">
        On-chain activity across the ThesisLock contracts on Stacks mainnet.
      </p>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div aria-busy="true">
          <div className="grid grid-cols-2 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-foreground/10 bg-white p-6"
              >
                <div className="h-3 w-20 rounded bg-foreground/10 animate-pulse mb-3" />
                <div className="h-8 w-24 rounded bg-foreground/10 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-foreground/10 bg-white p-6">
            <div className="h-40 w-full rounded bg-foreground/10 animate-pulse" />
          </div>
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <StatCard
              label="Total anchors"
              value={formatNumber(stats.totalAnchors)}
            />
            <StatCard
              label="Unique wallets"
              value={formatNumber(stats.uniqueWallets)}
            />
            <StatCard
              label="Contracts deployed"
              value={formatNumber(stats.contractsDeployed)}
            />
            <StatCard
              label="Latest block"
              value={
                stats.latestAnchorBlock
                  ? formatNumber(stats.latestAnchorBlock)
                  : "-"
              }
            />
          </div>

          <section className="rounded-lg border border-foreground/10 bg-white p-6 mb-8">
            <h2 className="text-sm uppercase tracking-wide text-foreground/50 mb-4">
              Activity per day
            </h2>
            {stats.anchorsByDay.length === 0 ? (
              <p className="text-sm text-foreground/60">No activity yet.</p>
            ) : (
              <div
                className="flex items-end gap-1 h-40"
                role="img"
                aria-label="Daily anchor activity bar chart"
              >
                {stats.anchorsByDay.map((d) => {
                  const pct = maxDayCount
                    ? Math.max(4, (d.count / maxDayCount) * 100)
                    : 0;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center justify-end h-full group"
                      title={`${formatDateLabel(d.date)}: ${d.count}`}
                    >
                      <div className="text-[10px] text-foreground/50 mb-1">
                        {d.count}
                      </div>
                      <div
                        className="w-full rounded-t bg-heading/80 group-hover:bg-heading transition"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
            {stats.anchorsByDay.length > 0 && (
              <div className="flex justify-between text-[10px] text-foreground/40 mt-2">
                <span>
                  {formatDateLabel(stats.anchorsByDay[0].date)}
                </span>
                <span>
                  {formatDateLabel(
                    stats.anchorsByDay[stats.anchorsByDay.length - 1].date,
                  )}
                </span>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-foreground/10 bg-white p-6">
            <h2 className="text-sm uppercase tracking-wide text-foreground/50 mb-4">
              Deployed contracts
            </h2>
            <ul className="space-y-3">
              {CONTRACTS.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between gap-4 flex-wrap"
                >
                  <div className="min-w-0">
                    <code className="font-mono text-sm">{c.name}</code>
                    <span className="ml-2 text-xs text-foreground/50">
                      {c.label}
                    </span>
                  </div>
                  <a
                    href={explorerAddressUrl(`${CONTRACT_ADDRESS}.${c.name}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs underline hover:no-underline shrink-0"
                  >
                    View on explorer &rarr;
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-xs text-foreground/50 grid grid-cols-2 gap-2">
              <span>
                Single anchors:{" "}
                {formatNumber(stats.totalAnchors - stats.totalBatchAnchors)}
              </span>
              <span>
                Batch anchors: {formatNumber(stats.totalBatchAnchors)}
              </span>
              <span>
                Registrations: {formatNumber(stats.totalRegistrations)}
              </span>
              {stats.firstAnchorBlock > 0 && (
                <span>
                  First block: {formatNumber(stats.firstAnchorBlock)}
                </span>
              )}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
