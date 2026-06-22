"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import CollectionsNavLink from "@/app/components/CollectionsNavLink";
import ThemeToggle from "@/app/components/ThemeToggle";
import EmptyState from "@/app/components/EmptyState";
import EmptyStateIcon from "@/app/components/EmptyStateIcon";
import Breadcrumbs from "@/app/components/Breadcrumbs";
import FeedSkeleton from "@/app/components/skeletons/FeedSkeleton";
import WatchlistButton from "@/app/components/WatchlistButton";
import AddToCollectionButton from "@/app/components/AddToCollectionButton";
import TruncatedHash from "@/app/components/TruncatedHash";
import TruncatedAddress from "@/app/components/TruncatedAddress";
import TagFilter from "@/app/components/TagFilter";
import {
  FOCUS_SEARCH_EVENT,
  FOCUS_SEARCH_FLAG,
} from "@/app/components/KeyboardShortcuts";
import { instrumentedFetch } from "@/lib/fetchInstrumented";
import {
  TAGS_CHANGED_EVENT,
  getHashesByTag,
  normalizeHash,
} from "@/lib/tags";
import { auditSearch } from "@/lib/auditEvents";
import { useI18n } from "@/app/components/I18nProvider";
import type { SearchResult, SearchSource, SearchType } from "@/lib/search";

const RECENT_KEY = "thesislock.search.recent";
const MAX_RECENT = 6;

const HEX_64 = /^[0-9a-f]{64}$/;
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

const TYPE_OPTIONS: { value: SearchType; id: string }[] = [
  { value: "auto", id: "typeAuto" },
  { value: "hash", id: "typeHash" },
  { value: "principal", id: "typePrincipal" },
  { value: "label", id: "typeLabel" },
];

const SOURCE_ORDER: SearchSource[] = [
  "single",
  "batch",
  "registry",
  "proof",
  "group",
];

const SOURCE_LABEL_IDS: Record<SearchSource, string> = {
  single: "sourceSingle",
  batch: "sourceBatch",
  registry: "sourceRegistry",
  proof: "sourceProof",
  group: "sourceGroup",
};

function detectType(query: string): Exclude<SearchType, "auto"> {
  const trimmed = query.trim();
  if (HEX_64.test(trimmed.toLowerCase())) return "hash";
  if (STX_PRINCIPAL.test(trimmed.toUpperCase())) return "principal";
  return "label";
}

function sourceBadgeClass(source: SearchSource): string {
  if (source === "single") {
    return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900";
  }
  if (source === "batch") {
    return "bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-900";
  }
  if (source === "proof") {
    return "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900";
  }
  if (source === "group") {
    return "bg-violet-50 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-900";
  }
  return "bg-foreground/5 text-foreground/70 border-foreground/10";
}

function readRecent(): string[] {
  try {
    const raw = window.sessionStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

export default function SearchClient() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType>("auto");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [, setTagTick] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  // Guards against a slow earlier request overwriting a newer one's results.
  const requestId = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  // Focus the search field when the global Ctrl+K / "/" shortcut fires, either
  // via a live event (already on this page) or a flag set before navigation.
  useEffect(() => {
    const focus = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener(FOCUS_SEARCH_EVENT, focus);
    try {
      if (window.sessionStorage.getItem(FOCUS_SEARCH_FLAG) === "1") {
        window.sessionStorage.removeItem(FOCUS_SEARCH_FLAG);
        focus();
      }
    } catch {
      // Non-fatal if sessionStorage is unavailable.
    }
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, focus);
  }, []);

  const pushRecent = useCallback((term: string) => {
    setRecent((prev) => {
      const next = [term, ...prev.filter((t) => t !== term)].slice(
        0,
        MAX_RECENT,
      );
      try {
        window.sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // Non-fatal if sessionStorage is unavailable.
      }
      return next;
    });
  }, []);

  const runSearch = useCallback(
    async (rawTerm: string, searchType: SearchType) => {
      const term = rawTerm.trim();
      if (!term) return;

      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      setSearchedFor(term);

      try {
        const params = new URLSearchParams({ q: term, type: searchType });
        const res = await instrumentedFetch(`/api/search?${params.toString()}`);
        if (!res.ok)
          throw new Error(t("search.fetchFailed", { status: res.status }));
        const data = (await res.json()) as SearchResult[];
        if (id !== requestId.current) return;
        setResults(Array.isArray(data) ? data : []);
        pushRecent(term);
        auditSearch(term, searchType);
      } catch {
        if (id !== requestId.current) return;
        setError(t("search.error"));
        setResults([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [pushRecent, t],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runSearch(query, type);
  };

  const onChipClick = (term: string) => {
    setQuery(term);
    void runSearch(term, type);
  };

  const effectiveType = type === "auto" ? detectType(query) : type;

  // Refresh when tags change in another tab so the tag filter stays current.
  useEffect(() => {
    const bump = () => setTagTick((n) => n + 1);
    window.addEventListener(TAGS_CHANGED_EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(TAGS_CHANGED_EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  // Narrow results to those whose hash carries any selected tag.
  const matchingHashes =
    selectedTags.length > 0
      ? new Set(selectedTags.flatMap((tag) => getHashesByTag(tag)))
      : null;
  const filteredResults = matchingHashes
    ? results.filter((r) => matchingHashes.has(normalizeHash(r.hash)))
    : results;
  const grouped = SOURCE_ORDER.map((source) => ({
    source,
    rows: filteredResults.filter((r) => r.source === source),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.back")}
        </Link>
        <Link
          href="/anchor"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.anchor")}
        </Link>
        <Link
          href="/anchors"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.myAnchors")}
        </Link>
        <Link
          href="/groups"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.groups")}
        </Link>
        <Link href="/feed" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.feed")}
        </Link>
        <span className="text-foreground font-medium">
          {t("common.nav.search")}
        </span>
        <Link href="/stats" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.stats")}
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
          href="/compare"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.compare")}
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

      <Breadcrumbs />

      <h1 className="text-3xl mb-2">{t("search.heading")}</h1>
      <p className="text-foreground/70 mb-8">{t("search.intro")}</p>

      <form onSubmit={onSubmit} className="mb-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.inputAria")}
            autoComplete="off"
            spellCheck={false}
            className="flex-1 rounded-md border border-foreground/15 bg-card px-4 py-2.5 text-sm focus:border-foreground/40 outline-none transition"
          />
          <button
            type="submit"
            disabled={loading || query.trim().length === 0}
            className="inline-flex items-center px-5 py-2.5 rounded-md bg-heading text-background font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("search.searching") : t("search.submit")}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-2 flex-wrap mb-2">
        {TYPE_OPTIONS.map((opt) => {
          const active = type === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              aria-pressed={active}
              className={`text-xs px-3 py-1 rounded-full border transition ${
                active
                  ? "bg-heading text-background border-heading"
                  : "border-foreground/15 text-foreground/70 hover:border-foreground/40"
              }`}
            >
              {t(`search.${opt.id}`)}
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <TagFilter
          selectedTags={selectedTags}
          onFilterChange={setSelectedTags}
        />
      </div>

      <p className="text-xs text-foreground/50 mb-8">
        {t("search.hint")}
        {query.trim() && type === "auto" && (
          <span>
            {" "}
            {t("search.detected", {
              type: t(`search.detectedType.${effectiveType}`),
            })}
          </span>
        )}
      </p>

      {!searchedFor && recent.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-foreground/50 uppercase tracking-wide mb-2">
            {t("search.recentSearches")}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {recent.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => onChipClick(term)}
                className="text-xs px-3 py-1 rounded-full border border-foreground/15 text-foreground/70 hover:border-foreground/40 transition font-mono"
              >
                {term.length > 24 ? `${term.slice(0, 24)}...` : term}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <FeedSkeleton />
      ) : searchedFor && results.length === 0 && !error ? (
        <EmptyState
          icon={<EmptyStateIcon name="search" />}
          title="No results found"
          description="Try a different hash, wallet address, or label."
          secondaryLabel="Browse the feed"
          secondaryHref="/feed"
        />
      ) : !searchedFor ? (
        <EmptyState
          icon={<EmptyStateIcon name="search" />}
          title="Search across all contracts"
          description="Enter a document hash, wallet address, or label to find anchors."
        />
      ) : (
        <div className="space-y-8">
          {searchedFor && selectedTags.length > 0 && grouped.length === 0 && (
            <p className="rounded-lg border border-foreground/10 bg-card p-6 text-center text-sm text-foreground/50">
              No results match the selected tags.
            </p>
          )}
          {grouped.map((group) => (
            <section key={group.source}>
              <h2 className="text-xs text-foreground/50 uppercase tracking-wide mb-3">
                {t(`search.${SOURCE_LABEL_IDS[group.source]}`)} (
                {group.rows.length})
              </h2>
              <ul className="space-y-3">
                {group.rows.map((row) => (
                  <li
                    key={`${row.source}|${row.hash}|${row.owner}|${row.groupId ?? ""}|${row.groupIndex ?? ""}`}
                    className="rounded-lg border border-foreground/10 bg-card p-5"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded border ${sourceBadgeClass(
                              row.source,
                            )}`}
                          >
                            {t(`search.badge.${row.source}`)}
                          </span>
                          {row.groupId !== undefined && (
                            <span className="text-xs text-foreground/50">
                              {t("search.groupLabel", { id: row.groupId })}
                            </span>
                          )}
                          <span className="text-xs text-foreground/50">
                            {t("search.blockLabel", {
                              block: row.stacksBlock,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <TruncatedHash hash={row.hash} />
                          <WatchlistButton
                            type="hash"
                            value={row.hash}
                            owner={
                              row.source === "batch" ||
                              row.source === "registry"
                                ? row.owner
                                : undefined
                            }
                            groupId={
                              row.source === "group" ? row.groupId : undefined
                            }
                            groupIndex={
                              row.source === "group"
                                ? row.groupIndex
                                : undefined
                            }
                          />
                          <AddToCollectionButton
                            hash={row.hash}
                            label={row.label}
                            verifyUrl={row.verifyUrl}
                          />
                        </div>
                        <div className="text-sm mb-2">
                          <span className="text-xs text-foreground/50 mr-2 uppercase tracking-wide">
                            {t("search.labelHeading")}
                          </span>
                          <code className="font-mono text-xs">
                            {row.label || t("search.unlabeled")}
                          </code>
                        </div>
                        {row.owner && (
                          <div className="text-sm">
                            <span className="text-xs text-foreground/50 mr-2 uppercase tracking-wide">
                              {t("search.ownerHeading")}
                            </span>
                            <TruncatedAddress address={row.owner} />
                          </div>
                        )}
                      </div>
                      <Link
                        href={row.verifyUrl}
                        className="text-sm text-foreground/70 hover:text-foreground whitespace-nowrap"
                      >
                        {t("search.verify")}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
