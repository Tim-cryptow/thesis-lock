"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";
import ContractDetail from "@/app/components/explorer/ContractDetail";
import ContractArchitecture from "@/app/components/explorer/ContractArchitecture";
import {
  CONTRACT_BLURBS,
  CONTRACT_REGISTRY,
  EXPLORER_CONTRACT_ADDRESS,
  fetchContractCallCount,
  getContract,
} from "@/lib/contractExplorer";

function ContractGlyph({ name }: { name: string }) {
  // A compact monospace badge using the part of the name after "thesislock".
  const suffix = name.replace(/^thesislock-?/, "") || "core";
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-foreground/15 bg-background font-mono text-[10px] uppercase text-foreground/70">
      {suffix.slice(0, 4)}
    </span>
  );
}

export default function ExplorerClient() {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    void Promise.all(
      CONTRACT_REGISTRY.map(async (c) => {
        const n = await fetchContractCallCount(c.name);
        return [c.name, n] as const;
      }),
    ).then((pairs) => {
      if (!active) return;
      setCounts(Object.fromEntries(pairs));
    });
    return () => {
      active = false;
    };
  }, []);

  const selectedContract = selected ? getContract(selected) : undefined;

  return (
    <div className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.back")}
        </Link>
        <Link
          href="/search"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.search")}
        </Link>
        <Link
          href="/anchor"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.anchor")}
        </Link>
        <Link href="/feed" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.feed")}
        </Link>
        <Link
          href="/stats"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.stats")}
        </Link>
        <span className="text-foreground font-medium">
          {t("common.nav.explorer")}
        </span>
        <Link
          href="/docs"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.docs")}
        </Link>
      </div>

      <h1 className="text-3xl mb-2">Contract Explorer</h1>
      <p className="text-foreground/70 mb-8 max-w-2xl">
        ThesisLock is five Clarity 3 contracts deployed to Stacks mainnet under{" "}
        <span className="font-mono text-foreground/90">
          {EXPLORER_CONTRACT_ADDRESS}
        </span>
        . Browse each one&apos;s functions, maps, and data variables, watch
        recent on-chain calls, and run read-only functions directly from here.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr] gap-8">
        <aside className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
              selected === null
                ? "border-foreground/30 bg-card"
                : "border-foreground/10 hover:border-foreground/25"
            }`}
          >
            <span className="font-medium">Overview</span>
            <span className="block text-xs text-foreground/55">
              All five contracts and how they relate
            </span>
          </button>
          {CONTRACT_REGISTRY.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setSelected(c.name)}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition ${
                selected === c.name
                  ? "border-foreground/30 bg-card"
                  : "border-foreground/10 hover:border-foreground/25"
              }`}
            >
              <ContractGlyph name={c.name} />
              <span className="min-w-0">
                <span className="block font-mono text-sm truncate">
                  {c.name}
                </span>
                <span className="block text-xs text-foreground/55">
                  {CONTRACT_BLURBS[c.name]}
                </span>
              </span>
            </button>
          ))}
        </aside>

        <main className="min-w-0">
          {selectedContract ? (
            <ContractDetail
              contract={selectedContract}
              callCount={counts[selectedContract.name]}
              onSelect={setSelected}
            />
          ) : (
            <Overview counts={counts} onSelect={setSelected} />
          )}
        </main>
      </div>
    </div>
  );
}

function Overview({
  counts,
  onSelect,
}: {
  counts: Record<string, number>;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      <ContractArchitecture onSelect={onSelect} />

      <div>
        <h2 className="text-xl mb-4">The five contracts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONTRACT_REGISTRY.map((c) => {
            const reads = c.functions.filter(
              (f) => f.access === "read-only",
            ).length;
            const writes = c.functions.filter(
              (f) => f.access === "public",
            ).length;
            const count = counts[c.name];
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onSelect(c.name)}
                className="rounded-lg border border-foreground/10 bg-card p-5 text-left transition hover:border-foreground/25"
              >
                <div className="flex items-center gap-3 mb-2">
                  <ContractGlyph name={c.name} />
                  <span className="font-mono text-sm">{c.name}</span>
                </div>
                <p className="text-sm text-foreground/65 mb-4">
                  {CONTRACT_BLURBS[c.name]}
                </p>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="text-foreground/45">Calls</dt>
                    <dd className="font-mono text-foreground/85">
                      {count === undefined ? "..." : count.toLocaleString("en-US")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-foreground/45">Functions</dt>
                    <dd className="font-mono text-foreground/85">
                      {writes + reads}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-foreground/45">Block</dt>
                    <dd className="font-mono text-foreground/85">
                      {c.deployBlock.toLocaleString("en-US")}
                    </dd>
                  </div>
                </dl>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
