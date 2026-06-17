"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import FileDropZone from "@/app/components/FileDropZone";
import { useI18n } from "@/app/components/I18nProvider";
import { hashFile } from "@/lib/stacks";
import { compareAnchors, HEX_64, type AnchorComparison } from "@/lib/compare";

const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

// Per-column input state. A column is "ready" once its hash is a valid 64 hex
// string, whether typed directly or produced by hashing a dropped file.
type ColumnState = {
  file: File | null;
  hash: string;
  hashError: string | null;
  hashing: boolean;
  owner: string;
};

const EMPTY_COLUMN: ColumnState = {
  file: null,
  hash: "",
  hashError: null,
  hashing: false,
  owner: "",
};

function isValidHash(hash: string): boolean {
  return HEX_64.test(hash.toLowerCase());
}

function ownerParam(owner: string): string | undefined {
  const upper = owner.trim().toUpperCase();
  return STX_PRINCIPAL.test(upper) ? upper : undefined;
}

export default function ComparePage() {
  const { t } = useI18n();

  const [a, setA] = useState<ColumnState>(EMPTY_COLUMN);
  const [b, setB] = useState<ColumnState>(EMPTY_COLUMN);
  const [comparison, setComparison] = useState<AnchorComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aHash = a.hash.toLowerCase().trim();
  const bHash = b.hash.toLowerCase().trim();
  const canCompare = isValidHash(aHash) && isValidHash(bHash) && !loading;

  const hashColumnFile = useCallback(
    async (file: File, set: typeof setA) => {
      set((s) => ({ ...s, file, hashing: true, hashError: null }));
      try {
        const h = await hashFile(file);
        set((s) => ({ ...s, hash: h, hashing: false }));
      } catch (e) {
        set((s) => ({
          ...s,
          hashing: false,
          hashError: e instanceof Error ? e.message : t("compare.fileError"),
        }));
      }
    },
    [t],
  );

  const onCompare = useCallback(async () => {
    if (!isValidHash(aHash) || !isValidHash(bHash)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await compareAnchors(
        aHash,
        bHash,
        ownerParam(a.owner),
        ownerParam(b.owner),
      );
      setComparison(result);
    } catch {
      setError(t("compare.compareError"));
    } finally {
      setLoading(false);
    }
  }, [aHash, bHash, a.owner, b.owner, t]);

  return (
    <div className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm flex-wrap">
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
        <Link
          href="/anchors"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.myAnchors")}
        </Link>
        <Link
          href="/feed"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.feed")}
        </Link>
        <Link
          href="/verify-bulk"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.bulkVerify")}
        </Link>
        <span className="text-foreground font-medium">
          {t("common.nav.compare")}
        </span>
      </div>

      <h1 className="text-3xl mt-8 mb-2">{t("compare.heading")}</h1>
      <p className="text-foreground/70 mb-8 max-w-2xl">{t("compare.intro")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DocColumn
          title={t("compare.columnA")}
          state={a}
          onFile={(f) => void hashColumnFile(f, setA)}
          onHashChange={(hash) =>
            setA((s) => ({ ...s, hash, file: null, hashError: null }))
          }
          onOwnerChange={(owner) => setA((s) => ({ ...s, owner }))}
        />
        <DocColumn
          title={t("compare.columnB")}
          state={b}
          onFile={(f) => void hashColumnFile(f, setB)}
          onHashChange={(hash) =>
            setB((s) => ({ ...s, hash, file: null, hashError: null }))
          }
          onOwnerChange={(owner) => setB((s) => ({ ...s, owner }))}
        />
      </div>

      <div className="mt-6 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => void onCompare()}
          disabled={!canCompare}
          className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? t("compare.comparing") : t("compare.compareButton")}
        </button>
        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm" role="alert">
            {error}
          </p>
        )}
      </div>

      {comparison && (
        <div className="mt-10" aria-live="polite">
          <h2 className="text-2xl mb-4">{t("compare.results.heading")}</h2>
          <p className="text-sm text-foreground/70">
            {t(
              `compare.results.${
                comparison.left.source !== "none" ? "verified" : "notFound"
              }`,
            )}{" "}
            /{" "}
            {t(
              `compare.results.${
                comparison.right.source !== "none" ? "verified" : "notFound"
              }`,
            )}
          </p>
        </div>
      )}
    </div>
  );
}

type DocColumnProps = {
  title: string;
  state: ColumnState;
  onFile: (file: File) => void;
  onHashChange: (hash: string) => void;
  onOwnerChange: (owner: string) => void;
};

function DocColumn({
  title,
  state,
  onFile,
  onHashChange,
  onOwnerChange,
}: DocColumnProps) {
  const { t } = useI18n();
  const showInvalid =
    state.hash.trim().length > 0 && !isValidHash(state.hash.trim());

  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-5">
      <h2 className="text-lg mb-3">{title}</h2>
      <FileDropZone onFile={onFile} ariaLabel={t("compare.dropPrompt")}>
        {state.file ? (
          <p className="text-foreground/80 font-medium break-all">
            {state.file.name}
          </p>
        ) : (
          <p className="text-foreground/60">{t("compare.dropPrompt")}</p>
        )}
      </FileDropZone>
      {state.hashing && (
        <p className="mt-2 text-sm text-foreground/60">
          {t("compare.hashing")}
        </p>
      )}
      {state.hashError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {state.hashError}
        </p>
      )}
      <p className="mt-3 text-xs text-foreground/50 uppercase tracking-wide">
        {t("compare.orPaste")}
      </p>
      <label className="sr-only" htmlFor={`hash-${title}`}>
        {t("compare.hashLabel")}
      </label>
      <input
        id={`hash-${title}`}
        type="text"
        value={state.hash}
        onChange={(e) => onHashChange(e.target.value)}
        placeholder={t("compare.hashPlaceholder")}
        spellCheck={false}
        autoComplete="off"
        className="mt-1 w-full font-mono text-xs px-3 py-2 rounded-md border border-foreground/15 bg-card focus:outline-none focus:border-foreground/50"
      />
      {showInvalid && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          {t("compare.hashInvalid")}
        </p>
      )}
      <label
        className="mt-3 block text-xs text-foreground/50 uppercase tracking-wide"
        htmlFor={`owner-${title}`}
      >
        {t("compare.ownerLabel")}
      </label>
      <input
        id={`owner-${title}`}
        type="text"
        value={state.owner}
        onChange={(e) => onOwnerChange(e.target.value)}
        placeholder={t("compare.ownerPlaceholder")}
        spellCheck={false}
        autoComplete="off"
        className="mt-1 w-full font-mono text-xs px-3 py-2 rounded-md border border-foreground/15 bg-card focus:outline-none focus:border-foreground/50"
      />
    </div>
  );
}
