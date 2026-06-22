"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import CollectionsNavLink from "@/app/components/CollectionsNavLink";
import ThemeToggle from "@/app/components/ThemeToggle";
import ErrorFallback from "@/app/components/ErrorFallback";
import AddToCollectionButton from "@/app/components/AddToCollectionButton";
import TagInput from "@/app/components/TagInput";
import TagFilter from "@/app/components/TagFilter";
import ContributionGraph from "@/app/components/calendar/ContributionGraph";
import DayDetail from "@/app/components/calendar/DayDetail";
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
import TruncatedHash from "@/app/components/TruncatedHash";
import { downloadCertificate } from "@/lib/downloadCertificate";
import { stageReportInput } from "@/lib/reportLink";
import { fetchAllAnchors } from "@/lib/fetchAllAnchors";
import {
  downloadExport,
  formatAnchorsCSV,
  formatAnchorsJSON,
} from "@/lib/export";
import { getTemplate, parseLabel } from "@/lib/templates";
import {
  TAGS_CHANGED_EVENT,
  getTagColor,
  getTagsForHash,
} from "@/lib/tags";
import { auditExport } from "@/lib/auditEvents";
import { buildYearGrid, type CalendarDay } from "@/lib/calendar";

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
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  // Toggles the My Anchors body between the list and a calendar of the year.
  const [view, setView] = useState<"list" | "calendar">("list");
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calendarSelected, setCalendarSelected] = useState<string | null>(null);
  // Hashes ticked for side-by-side comparison. Capped at two: the compare page
  // takes exactly two documents.
  const [selected, setSelected] = useState<string[]>([]);
  // Tags are edited inline per row. expandedTag is the hash whose editor is open;
  // tagTick refreshes the displayed pills when tags change here or in another tab.
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const toggleTagFilter = (name: string) =>
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  // Bumping this state re-renders so the inline tag map below re-reads storage.
  const [, setTagTick] = useState(0);
  useEffect(() => {
    const bump = () => setTagTick((n) => n + 1);
    window.addEventListener(TAGS_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(TAGS_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  const toggleSelect = (hash: string) => {
    setSelected((prev) => {
      if (prev.includes(hash)) return prev.filter((h) => h !== hash);
      if (prev.length >= 2) return prev;
      return [...prev, hash];
    });
  };

  // Both anchors belong to this wallet, so pass its address as the owner for
  // each. The compare page prefers the owner-keyed batch record and falls back
  // to the global single anchor, so this is correct for either anchor type.
  const compareHref =
    selected.length === 2 && address
      ? `/compare?a=${selected[0]}&b=${selected[1]}&ownerA=${encodeURIComponent(
          address,
        )}&ownerB=${encodeURIComponent(address)}`
      : null;

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
    setSelected([]);
    if (!address) {
      setCount(null);
      setEntries([]);
      return;
    }
    void loadHistory(address);
  }, [address, loadHistory]);

  // Loads the year grid the first time the calendar view is opened (and on year
  // rollover). The calendar lib caches the underlying fetch, so toggling is cheap.
  useEffect(() => {
    if (!address || view !== "calendar") return;
    let active = true;
    buildYearGrid(address)
      .then((days) => {
        if (active) setCalendarDays(days);
      })
      .catch(() => {
        if (active) setCalendarDays([]);
      });
    return () => {
      active = false;
    };
  }, [address, view]);

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
      auditExport(format, { scope: "anchors" });
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

  // Current tags per visible anchor. Recomputed each render (the list is the
  // bounded recent set) and refreshed by the tag-change tick above.
  const tagsByHash = new Map<string, string[]>();
  for (const { entry } of visibleEntries) {
    tagsByHash.set(entry.hash, getTagsForHash(entry.hash));
  }

  // Narrow the visible anchors to those carrying any selected tag.
  const filteredEntries =
    selectedTags.length === 0
      ? visibleEntries
      : visibleEntries.filter(({ entry }) => {
          const tags = tagsByHash.get(entry.hash) ?? [];
          return selectedTags.some((t) => tags.includes(t));
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
          <Link href="/tags" className="text-foreground/60 hover:text-foreground">
            Tags
          </Link>
          {address && (
            <Link
              href={`/u/${address}`}
              className="text-foreground/60 hover:text-foreground"
            >
              {t("common.nav.myProfile")}
            </Link>
          )}
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
          <Link
            href="/report"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.report")}
          </Link>
          <Link
            href="/explorer"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.explorer")}
          </Link>
          <WatchlistNavLink />
          <CollectionsNavLink />
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
        <>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-foreground/50 uppercase tracking-wide mr-1">
              View
            </span>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`text-sm px-3 py-1.5 rounded-md border transition ${
                view === "list"
                  ? "border-foreground/40 bg-foreground/10"
                  : "border-foreground/15 hover:border-foreground/40"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`text-sm px-3 py-1.5 rounded-md border transition ${
                view === "calendar"
                  ? "border-foreground/40 bg-foreground/10"
                  : "border-foreground/15 hover:border-foreground/40"
              }`}
            >
              Calendar view
            </button>
          </div>
          {view === "calendar" ? (
            <div className="rounded-lg border border-foreground/10 bg-card p-4 sm:p-6">
              <ContributionGraph
                days={calendarDays}
                selectedDate={calendarSelected}
                onSelectDay={(d) =>
                  setCalendarSelected((c) => (c === d.date ? null : d.date))
                }
              />
              <DayDetail
                day={
                  calendarSelected
                    ? calendarDays.find((d) => d.date === calendarSelected) ?? null
                    : null
                }
                owner={address}
                onClose={() => setCalendarSelected(null)}
              />
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
          <TagFilter
            selectedTags={selectedTags}
            onFilterChange={setSelectedTags}
          />
          <div className="flex items-center justify-between gap-3 flex-wrap pb-1">
            <p className="text-xs text-foreground/50">
              {t("anchors.compareHint")}
            </p>
            <div className="flex gap-2">
              {filteredEntries.length > 0 && (
                <Link
                  href="/report"
                  onClick={() =>
                    stageReportInput(
                      filteredEntries.map(({ entry }) => ({ hash: entry.hash })),
                    )
                  }
                  className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                >
                  {t("anchors.generateReport")}
                </Link>
              )}
              {compareHref && (
                <Link
                  href={compareHref}
                  className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                >
                  {t("anchors.compareSelected")} &rarr;
                </Link>
              )}
            </div>
          </div>
          {filteredEntries.map(({ entry, parsed }, idx) => (
            <div
              key={`${entry.hash}-${idx}`}
              role="listitem"
              className="rounded-lg border border-foreground/10 bg-card p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <input
                  type="checkbox"
                  checked={selected.includes(entry.hash)}
                  disabled={
                    !selected.includes(entry.hash) && selected.length >= 2
                  }
                  onChange={() => toggleSelect(entry.hash)}
                  aria-label={t("anchors.selectAria", {
                    hash: truncateHash(entry.hash),
                  })}
                  className="mt-1 h-4 w-4 shrink-0 accent-current disabled:opacity-40"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                    {t("anchors.hashLabel")}
                  </div>
                  <div className="flex items-center gap-2">
                    <TruncatedHash hash={entry.hash} />
                    <AddToCollectionButton
                      hash={entry.hash}
                      label={entry.label}
                      verifyUrl={`/v/${entry.hash}?owner=${encodeURIComponent(address)}`}
                    />
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
              <div className="mt-4 border-t border-foreground/10 pt-3">
                {expandedTag === entry.hash ? (
                  <div className="flex flex-col gap-2">
                    <TagInput
                      hash={entry.hash}
                      label={entry.label}
                      verifyUrl={`/v/${entry.hash}?owner=${encodeURIComponent(address)}`}
                      compact
                      onTagsChange={() => setTagTick((n) => n + 1)}
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedTag(null)}
                      className="self-start text-xs text-foreground/60 hover:text-foreground"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(tagsByHash.get(entry.hash) ?? []).map((name) => {
                      const color = getTagColor(name);
                      const active = selectedTags.includes(name);
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleTagFilter(name)}
                          aria-pressed={active}
                          title={active ? "Remove tag filter" : "Filter by tag"}
                          className="rounded-full border px-2 py-0.5 text-[11px] font-medium transition"
                          style={
                            active
                              ? {
                                  backgroundColor: color,
                                  color: "#ffffff",
                                  borderColor: color,
                                }
                              : {
                                  backgroundColor: `${color}1f`,
                                  color,
                                  borderColor: `${color}55`,
                                }
                          }
                        >
                          {name}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setExpandedTag(entry.hash)}
                      className="text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
                    >
                      {(tagsByHash.get(entry.hash) ?? []).length > 0
                        ? "Edit tags"
                        : "Add tags"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredEntries.length === 0 && selectedTags.length > 0 && (
            <p className="text-center text-sm text-foreground/50">
              No anchors match the selected tags.
            </p>
          )}
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
        </>
      )}
    </div>
  );
}
