"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import ErrorFallback from "@/app/components/ErrorFallback";
import { useI18n } from "@/app/components/I18nProvider";
import {
  BATCH_CONTRACT_FULL_NAME,
  SINGLE_CONTRACT_NAME,
  getAnchorCount,
  getRecentAnchors,
  readAnchor,
  readBatchAnchor,
  type RegistryEntry,
} from "@/lib/stacks";
import { truncateAddress, useWallet } from "@/lib/wallet";
import { downloadCertificate } from "@/lib/downloadCertificate";
import { fetchAllAnchors } from "@/lib/fetchAllAnchors";
import {
  downloadExport,
  formatAnchorsCSV,
  formatAnchorsJSON,
} from "@/lib/export";
import { getTemplate, parseLabel } from "@/lib/templates";

// Sentinel filter value for anchors whose label is free-form (no template).
const UNSTRUCTURED_FILTER = "__unstructured";

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export default function AnchorsPage() {
  const { t } = useI18n();
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [templateFilter, setTemplateFilter] = useState<string>("all");

  const loadHistory = useCallback(async (owner: string) => {
    setLoading(true);
    setError(null);
    try {
      const [c, recent] = await Promise.all([
        getAnchorCount(owner),
        getRecentAnchors(owner),
      ]);
      setCount(c);
      setEntries(recent.filter((e): e is RegistryEntry => e !== null));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("anchors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!address) {
      setCount(null);
      setEntries([]);
      return;
    }
    void loadHistory(address);
  }, [address, loadHistory]);

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const [certBusyHash, setCertBusyHash] = useState<string | null>(null);
  const [certErrorHash, setCertErrorHash] = useState<string | null>(null);

  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async (format: "csv" | "json") => {
    if (!address) return;
    setExportError(null);
    setExporting(format);
    try {
      const all = await fetchAllAnchors(address);
      const stamp = address.slice(0, 8);
      if (format === "csv") {
        downloadExport(
          formatAnchorsCSV(all, address),
          `thesislock-anchors-${stamp}.csv`,
          "text/csv;charset=utf-8",
        );
      } else {
        downloadExport(
          formatAnchorsJSON(all, address),
          `thesislock-anchors-${stamp}.json`,
          "application/json",
        );
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : t("anchors.exportError"));
      setTimeout(() => setExportError(null), 4000);
    } finally {
      setExporting(null);
    }
  };

  const downloadEntryCertificate = async (entry: RegistryEntry) => {
    if (!address) return;
    setCertErrorHash(null);
    setCertBusyHash(entry.hash);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      // Check the wallet's batch entry first. thesislock-batch is keyed by
      // {hash, owner}, while thesislock is global (one anchor per hash,
      // anyone can claim). For a registry entry that belongs to this wallet
      // via a batch anchor, the global single record may name a different
      // anchorer for the same hash — falling through to it would generate a
      // certificate for the wrong record.
      const batch = await readBatchAnchor(entry.hash, address);
      if (batch) {
        downloadCertificate({
          hash: entry.hash,
          label: batch.label || entry.label,
          owner: address,
          stacksBlock: batch.stacksBlock,
          burnBlock: batch.burnBlock,
          timestamp: new Date().toISOString(),
          contractName: BATCH_CONTRACT_FULL_NAME,
          verifyUrl: `${origin}/v/${entry.hash}?owner=${encodeURIComponent(address)}`,
        });
        return;
      }
      const single = await readAnchor(entry.hash);
      if (single) {
        downloadCertificate({
          hash: entry.hash,
          label: single.label || entry.label,
          owner: single.anchoredBy,
          stacksBlock: single.stacksBlock,
          burnBlock: single.burnBlock,
          timestamp: new Date().toISOString(),
          contractName: SINGLE_CONTRACT_NAME,
          verifyUrl: `${origin}/v/${entry.hash}`,
        });
        return;
      }
      setCertErrorHash(entry.hash);
      setTimeout(() => setCertErrorHash(null), 4000);
    } catch {
      setCertErrorHash(entry.hash);
      setTimeout(() => setCertErrorHash(null), 4000);
    } finally {
      setCertBusyHash(null);
    }
  };

  // Parse each label so structured anchors can show a template badge and be
  // filtered. Free-form labels parse to no templateId and fall through.
  const parsedEntries = entries.map((entry) => ({
    entry,
    parsed: parseLabel(entry.label),
  }));
  const presentTemplateIds = Array.from(
    new Set(
      parsedEntries
        .map((p) => p.parsed.templateId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const hasStructured = presentTemplateIds.length > 0;
  // Fall back to "all" when the selector is hidden or the selected template is
  // no longer present (e.g. after switching wallets), so a stale filter can
  // never leave the list empty with no way to recover.
  const filterAvailable =
    templateFilter === "all" ||
    templateFilter === UNSTRUCTURED_FILTER ||
    presentTemplateIds.includes(templateFilter);
  const effectiveFilter = hasStructured && filterAvailable ? templateFilter : "all";
  const visibleEntries = parsedEntries.filter(({ parsed }) => {
    if (effectiveFilter === "all") return true;
    if (effectiveFilter === UNSTRUCTURED_FILTER) return !parsed.templateId;
    return parsed.templateId === effectiveFilter;
  });

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <div className="order-last ml-auto"><ThemeToggle /></div>
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.back")}
          </Link>
          <Link href="/search" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.search")}
          </Link>
          <Link
            href="/anchor"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.anchor")}
          </Link>
          <span className="text-foreground font-medium">{t("common.nav.myAnchors")}</span>
          <Link
            href="/groups"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.groups")}
          </Link>
          <Link
            href="/feed"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.feed")}
          </Link>
          <Link
            href="/stats"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.stats")}
          </Link>
          <Link
            href="/verify-bulk"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.bulkVerify")}
          </Link>
          <Link
            href="/dashboard"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.dashboard")}
          </Link>
          <Link
            href="/activity"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.activity")}
          </Link>
        </div>
        {address ? (
          <button
            onClick={disconnectWallet}
            className="text-sm font-mono px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            title={t("common.wallet.disconnect")}
          >
            {truncateAddress(address)}
          </button>
        ) : (
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="text-sm px-3 py-2 rounded-md bg-heading text-background hover:opacity-90 disabled:opacity-50"
          >
            {connecting ? t("common.wallet.opening") : t("common.wallet.connect")}
          </button>
        )}
      </div>

      <h1 className="text-3xl mb-2">{t("anchors.heading")}</h1>
      <p className="text-foreground/70 mb-8">
        {t("anchors.intro")}
      </p>

      {!address ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">
            {t("anchors.connectPrompt")}
          </p>
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-50"
          >
            {connecting ? t("common.wallet.opening") : t("common.wallet.connect")}
          </button>
        </div>
      ) : loading ? (
        <p className="text-foreground/60">{t("anchors.loading")}</p>
      ) : error ? (
        <ErrorFallback
          message={error}
          onRetry={() => void loadHistory(address)}
        />
      ) : count === 0 ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">{t("anchors.empty")}</p>
          <Link
            href="/anchor"
            className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
          >
            {t("anchors.emptyCta")}
          </Link>
        </div>
      ) : (
        <div className="space-y-3" role="list">
          {hasStructured && (
            <div className="flex items-center gap-2 pb-1">
              <label
                htmlFor="template-filter"
                className="text-xs text-foreground/50 uppercase tracking-wide"
              >
                {t("templates.filter.label")}
              </label>
              <select
                id="template-filter"
                value={effectiveFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="text-sm px-2 py-1 rounded-md border border-foreground/15 bg-card focus:outline-none focus:border-foreground/50"
              >
                <option value="all">{t("templates.filter.all")}</option>
                {presentTemplateIds.map((id) => (
                  <option key={id} value={id}>
                    {getTemplate(id)?.name ?? id}
                  </option>
                ))}
                <option value={UNSTRUCTURED_FILTER}>
                  {t("templates.filter.unstructured")}
                </option>
              </select>
            </div>
          )}
          {visibleEntries.map(({ entry, parsed }, idx) => (
            <div
              key={`${entry.hash}-${idx}`}
              role="listitem"
              className="rounded-lg border border-foreground/10 bg-card p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                    {t("anchors.hashLabel")}
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm">
                      {truncateHash(entry.hash)}
                    </code>
                    <button
                      onClick={() => void copyHash(entry.hash)}
                      aria-label={t("anchors.copyHashAria")}
                      className="text-xs px-2 py-1 rounded border border-foreground/15 hover:border-foreground/40 transition"
                    >
                      {copiedHash === entry.hash ? t("common.actions.copied") : t("common.actions.copy")}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto sm:shrink-0">
                  <button
                    onClick={() => void downloadEntryCertificate(entry)}
                    disabled={certBusyHash === entry.hash}
                    aria-label={t("anchors.downloadCertAria")}
                    className="flex-1 sm:flex-none text-center text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
                    title={t("anchors.downloadCertAria")}
                  >
                    {certBusyHash === entry.hash ? t("anchors.preparing") : t("anchors.download")}
                  </button>
                  <Link
                    href={`/v/${entry.hash}?owner=${encodeURIComponent(address)}`}
                    aria-label={t("anchors.verifyAria", { hash: truncateHash(entry.hash) })}
                    className="flex-1 sm:flex-none text-center text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                  >
                    {t("anchors.verify")} &rarr;
                  </Link>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                    {t("anchors.labelLabel")}
                  </div>
                  {parsed.templateId && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-foreground/60 border border-foreground/15 rounded px-1.5 py-0.5 mb-1">
                      <span
                        aria-hidden="true"
                        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-heading text-background text-[8px] font-semibold"
                      >
                        {getTemplate(parsed.templateId)?.icon}
                      </span>
                      {getTemplate(parsed.templateId)?.name}
                    </span>
                  )}
                  <code className="font-mono text-xs block">
                    {entry.label || t("anchors.labelNone")}
                  </code>
                </div>
                <div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                    {t("anchors.stacksBlockLabel")}
                  </div>
                  <code className="font-mono text-xs">{entry.anchoredAt}</code>
                </div>
              </div>
              {certErrorHash === entry.hash && (
                <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                  {t("anchors.certError")}
                </p>
              )}
            </div>
          ))}
          <div className="flex flex-col items-center gap-3 pt-4">
            {count !== null && count > entries.length && (
              <p className="text-xs text-foreground/50 text-center">
                {t("anchors.showingRecent", { count })}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => void handleExport("csv")}
                disabled={!count || exporting !== null}
                className="text-sm px-4 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
              >
                {exporting === "csv" ? t("anchors.exporting") : t("anchors.exportCsv")}
              </button>
              <button
                onClick={() => void handleExport("json")}
                disabled={!count || exporting !== null}
                className="text-sm px-4 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
              >
                {exporting === "json" ? t("anchors.exporting") : t("anchors.exportJson")}
              </button>
            </div>
            {exportError && (
              <p className="text-xs text-amber-700 dark:text-amber-400">{exportError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
