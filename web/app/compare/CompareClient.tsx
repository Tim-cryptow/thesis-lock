"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import FileDropZone from "@/app/components/FileDropZone";
import { useI18n } from "@/app/components/I18nProvider";
import { hashFile } from "@/lib/stacks";
import {
  compareAnchors,
  HEX_64,
  type AnchorComparison,
  type CompareEntry,
} from "@/lib/compare";
import { getTemplate } from "@/lib/templates";

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
          <ResultsTable comparison={comparison} />
        </div>
      )}
    </div>
  );
}

// A cell that differs between the two documents gets a subtle highlight so the
// metadata that changed across versions is immediately visible.
const HIGHLIGHT = "bg-amber-400/10";

function SourceBadge({ source }: { source: string }) {
  const { t } = useI18n();
  if (source === "none") {
    return <span className="text-foreground/50">{t("compare.source.none")}</span>;
  }
  return (
    <span className="inline-flex items-center text-[10px] uppercase tracking-wide text-foreground/70 border border-foreground/20 rounded-full px-2 py-0.5">
      {t(`compare.source.${source}`)}
    </span>
  );
}

// Renders an entry's label: a template badge plus parsed fields when the label
// was created from a template, otherwise the raw label exactly as stored.
function LabelCell({ entry }: { entry: CompareEntry }) {
  const { t } = useI18n();
  if (entry.source === "none") {
    return <span className="text-foreground/40">{t("compare.results.dash")}</span>;
  }
  const template = entry.template?.templateId
    ? getTemplate(entry.template.templateId)
    : undefined;
  if (!template || !entry.template) {
    return (
      <code className="font-mono text-xs break-all">
        {entry.label || t("compare.results.noLabel")}
      </code>
    );
  }
  return (
    <div>
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-foreground/60 border border-foreground/15 rounded px-1.5 py-0.5 mb-1">
        <span
          aria-hidden="true"
          className="inline-flex h-3.5 w-3.5 items-center justify-center rounded bg-heading text-background text-[8px] font-semibold"
        >
          {template.icon}
        </span>
        {template.name}
      </span>
      <dl className="space-y-0.5">
        {Object.entries(entry.template.fields).map(([key, value]) => {
          const field = template.fields.find((f) => f.key === key);
          return (
            <div key={key} className="flex gap-2 text-xs">
              <dt className="text-foreground/50 shrink-0">
                {field?.name ?? key}
              </dt>
              <dd className="font-mono break-all">{value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function HashCell({ entry }: { entry: CompareEntry }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(entry.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied; the hash stays visible to copy by hand.
    }
  };
  return (
    <div className="flex items-start gap-2">
      <code className="font-mono text-xs break-all">{entry.hash}</code>
      <button
        onClick={() => void copy()}
        aria-label={t("compare.copy")}
        className="shrink-0 text-[10px] px-2 py-0.5 rounded border border-foreground/15 hover:border-foreground/40 transition"
      >
        {copied ? t("compare.copied") : t("compare.copy")}
      </button>
    </div>
  );
}

function OwnerCell({ entry }: { entry: CompareEntry }) {
  const { t } = useI18n();
  if (entry.source === "none" || !entry.owner) {
    return <span className="text-foreground/40">{t("compare.results.dash")}</span>;
  }
  return (
    <Link
      href={`/u/${entry.owner}`}
      className="font-mono text-xs break-all underline hover:no-underline"
    >
      {entry.owner}
    </Link>
  );
}

function ResultsTable({ comparison }: { comparison: AnchorComparison }) {
  const { t } = useI18n();
  const { left, right } = comparison;
  const leftFound = left.source !== "none";
  const rightFound = right.source !== "none";
  const bothFound = leftFound && rightFound;

  const statusCell = (entry: CompareEntry) =>
    entry.source !== "none" ? (
      <span className="text-green-700 dark:text-green-400">
        {t("compare.results.verified")} &#10003;
      </span>
    ) : (
      <span className="text-red-600 dark:text-red-400">
        {t("compare.results.notFound")} &#10007;
      </span>
    );

  const blockCell = (entry: CompareEntry) =>
    entry.source !== "none" ? (
      <code className="font-mono text-xs">{entry.block}</code>
    ) : (
      <span className="text-foreground/40">{t("compare.results.dash")}</span>
    );

  const proofCell = (entry: CompareEntry) =>
    entry.proofNFT !== null && entry.proofNFT !== undefined ? (
      <code className="font-mono text-xs">#{entry.proofNFT}</code>
    ) : (
      <span className="text-foreground/50">{t("compare.results.none")}</span>
    );

  // Each row pairs a field name with its renderer for both sides, plus whether
  // the two sides differ. Differences are only flagged when both documents are
  // anchored, since the Status row already conveys a missing anchor.
  const rows: Array<{
    key: string;
    label: string;
    differs: boolean;
    render: (entry: CompareEntry) => ReactNode;
  }> = [
    {
      key: "hash",
      label: t("compare.results.rowHash"),
      differs: false,
      render: (entry) => <HashCell entry={entry} />,
    },
    {
      key: "status",
      label: t("compare.results.rowStatus"),
      differs: leftFound !== rightFound,
      render: statusCell,
    },
    {
      key: "label",
      label: t("compare.results.rowLabel"),
      differs: bothFound && !comparison.sameLabel,
      render: (entry) => <LabelCell entry={entry} />,
    },
    {
      key: "source",
      label: t("compare.results.rowSource"),
      differs: bothFound && !comparison.sameSource,
      render: (entry) => <SourceBadge source={entry.source} />,
    },
    {
      key: "owner",
      label: t("compare.results.rowOwner"),
      differs: bothFound && !comparison.sameOwner,
      render: (entry) => <OwnerCell entry={entry} />,
    },
    {
      key: "block",
      label: t("compare.results.rowBlock"),
      differs: bothFound && left.block !== right.block,
      render: blockCell,
    },
    {
      key: "proof",
      label: t("compare.results.rowProof"),
      differs: bothFound && left.proofNFT !== right.proofNFT,
      render: proofCell,
    },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-foreground/10 bg-card">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-foreground/10 text-left">
            <th className="p-3 font-medium text-foreground/50 uppercase text-xs tracking-wide w-32">
              {t("compare.results.field")}
            </th>
            <th className="p-3 font-medium">{t("compare.columnA")}</th>
            <th className="p-3 font-medium">{t("compare.columnB")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-foreground/10 align-top">
              <td className="p-3 text-foreground/50 uppercase text-xs tracking-wide">
                {row.label}
              </td>
              <td className={`p-3 ${row.differs ? HIGHLIGHT : ""}`}>
                {row.render(left)}
              </td>
              <td className={`p-3 ${row.differs ? HIGHLIGHT : ""}`}>
                {row.render(right)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
