"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLive } from "@/app/components/LiveProvider";
import { getStxAddress } from "@/lib/wallet";
import { formatBytes, getStorageUsage } from "@/lib/dataPortability";
import {
  CONTRACT_BLURBS,
  CONTRACT_REGISTRY,
  EXPLORER_CONTRACT_ADDRESS,
} from "@/lib/contractExplorer";
import { REPO_URL } from "@/lib/docs";

const APP_VERSION = "1.0.0";

const TECH_STACK = [
  "Next.js 16 (App Router, TypeScript)",
  "Clarity 3 smart contracts on Stacks mainnet",
  "Stacks Connect (Leather, Xverse, Asigna)",
  "Tailwind CSS",
  "Reads via the public Hiro API",
];

const LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "GitHub", href: REPO_URL, external: true },
  { label: "Docs", href: "/docs" },
  { label: "Status page", href: "/status" },
  { label: "Developer portal", href: "/developers" },
];

function contractUrl(name: string): string {
  return `https://explorer.hiro.so/txid/${EXPLORER_CONTRACT_ADDRESS}.${name}?chain=mainnet`;
}

function formatTimestamp(ms: number | null): string {
  if (!ms) return "never";
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleString();
}

type DebugInfo = {
  userAgent: string;
  platform: string;
  storage: string;
  wallet: string | null;
};

export default function AboutSection() {
  const { lastUpdate } = useLive();
  const [debug, setDebug] = useState<DebugInfo | null>(null);

  useEffect(() => {
    setDebug({
      userAgent: navigator.userAgent,
      platform: navigator.platform || "unknown",
      storage: formatBytes(getStorageUsage().totalSize),
      wallet: getStxAddress(),
    });
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-xl mb-1">ThesisLock v{APP_VERSION}</h2>
        <p className="text-sm text-foreground/70 max-w-2xl">
          A hash-anchor service for academic and creative documents on the Stacks blockchain. Prove
          a document existed at a point in time without ever exposing the document itself.
        </p>
      </section>

      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-xl mb-1">Protocol</h2>
        <p className="text-sm text-foreground/65 mb-4 max-w-2xl">
          Five Clarity contracts deployed on Stacks mainnet under{" "}
          <span className="mono break-all">{EXPLORER_CONTRACT_ADDRESS}</span>.
        </p>
        <ul className="flex flex-col divide-y divide-foreground/10">
          {CONTRACT_REGISTRY.map((contract) => (
            <li
              key={contract.name}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <div className="min-w-0">
                <div className="mono text-sm text-foreground">{contract.name}</div>
                <div className="text-xs text-foreground/55">
                  {CONTRACT_BLURBS[contract.name] ?? ""}
                </div>
              </div>
              <a
                href={contractUrl(contract.name)}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-foreground/60 underline hover:text-foreground"
              >
                Explorer
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-xl mb-1">Tech stack</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-foreground/70">
          {TECH_STACK.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-xl mb-1">Links</h2>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-foreground/70 underline hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="text-foreground/70 underline hover:text-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-xl mb-1">License and credits</h2>
        <p className="text-sm text-foreground/70 max-w-2xl">
          Released under the MIT License. Built on Stacks, with on-chain reads served by the public
          Hiro API. Thanks to the Stacks and Hiro communities and to the maintainers of the
          open-source libraries this project depends on.
        </p>
      </section>

      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-xl mb-1">Debug info</h2>
        <details className="mt-1 text-sm">
          <summary className="cursor-pointer text-foreground/70 hover:text-foreground">
            Show environment details
          </summary>
          <dl className="mt-3 grid grid-cols-[9rem_1fr] gap-x-3 gap-y-2">
            <dt className="text-foreground/55">Browser</dt>
            <dd className="mono break-all">{debug?.userAgent ?? "..."}</dd>
            <dt className="text-foreground/55">Platform</dt>
            <dd>{debug?.platform ?? "..."}</dd>
            <dt className="text-foreground/55">Local storage</dt>
            <dd>{debug?.storage ?? "..."}</dd>
            <dt className="text-foreground/55">Connected wallet</dt>
            <dd className="mono break-all">{debug?.wallet ?? "not connected"}</dd>
            <dt className="text-foreground/55">Last sync</dt>
            <dd>{formatTimestamp(lastUpdate)}</dd>
          </dl>
        </details>
      </section>
    </div>
  );
}
