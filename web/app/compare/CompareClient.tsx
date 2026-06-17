"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import FileDropZone from "@/app/components/FileDropZone";
import { useI18n } from "@/app/components/I18nProvider";
import { hashFile } from "@/lib/stacks";
import {
  compareAnchors,
  HEX_64,
  type AnchorComparison,
  type CompareEntry,
  type GroupLocation,
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
  // Set only from a shareable link that points at a specific group anchor, so
  // the comparison resolves that exact record. Cleared on any manual edit.
  group?: GroupLocation;
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

// A group location needs both a group id and a non-negative integer index;
// anything else drops the location so the comparison resolves by hash.
function parseGroupParam(
  groupValue: string | null,
  indexValue: string | null,
): GroupLocation | undefined {
  if (groupValue === null || indexValue === null) return undefined;
  const groupId = Number(groupValue);
  const index = Number(indexValue);
  if (!Number.isInteger(groupId) || groupId < 0) return undefined;
  if (!Number.isInteger(index) || index < 0) return undefined;
  return { groupId, index };
}

export default function ComparePage() {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  const [a, setA] = useState<ColumnState>(EMPTY_COLUMN);
  const [b, setB] = useState<ColumnState>(EMPTY_COLUMN);
  const [comparison, setComparison] = useState<AnchorComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  const aHash = a.hash.toLowerCase().trim();
  const bHash = b.hash.toLowerCase().trim();
  const canCompare =
    isValidHash(aHash) &&
    isValidHash(bHash) &&
    !loading &&
    !a.hashing &&
    !b.hashing;

  const hashColumnFile = useCallback(
    async (file: File, set: typeof setA) => {
      // Clear the previous hash up front: a stale hash left in place while the
      // new file is hashing (or if hashing fails) would otherwise let a compare
      // run against the old document while the new file name is shown.
      set((s) => ({
        ...s,
        file,
        hash: "",
        group: undefined,
        hashing: true,
        hashError: null,
      }));
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

  const runCompare = useCallback(
    async (
      aH: string,
      bH: string,
      aOwner: string,
      bOwner: string,
      aGroup?: GroupLocation,
      bGroup?: GroupLocation,
    ) => {
      if (!isValidHash(aH) || !isValidHash(bH)) return;
      setLoading(true);
      setError(null);
      try {
        const result = await compareAnchors(
          aH,
          bH,
          ownerParam(aOwner),
          ownerParam(bOwner),
          aGroup,
          bGroup,
        );
        setComparison(result);
      } catch {
        setError(t("compare.compareError"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const onCompare = useCallback(
    () => void runCompare(aHash, bHash, a.owner, b.owner, a.group, b.group),
    [runCompare, aHash, bHash, a.owner, b.owner, a.group, b.group],
  );

  // Hydrate from shareable URL params once on load and auto-compare when both
  // hashes are present, so a shared link opens straight to its result. Group
  // locations (?groupA=&giA=&groupB=&giB=) pin a specific group anchor. Runs a
  // single time; later edits go through the inputs.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const pa = (searchParams.get("a") ?? "").toLowerCase().trim();
    const pb = (searchParams.get("b") ?? "").toLowerCase().trim();
    const poa = searchParams.get("ownerA") ?? "";
    const pob = searchParams.get("ownerB") ?? "";
    const pga = parseGroupParam(
      searchParams.get("groupA"),
      searchParams.get("giA"),
    );
    const pgb = parseGroupParam(
      searchParams.get("groupB"),
      searchParams.get("giB"),
    );
    if (isValidHash(pa)) setA((s) => ({ ...s, hash: pa, owner: poa, group: pga }));
    if (isValidHash(pb)) setB((s) => ({ ...s, hash: pb, owner: pob, group: pgb }));
    if (isValidHash(pa) && isValidHash(pb)) {
      void runCompare(pa, pb, poa, pob, pga, pgb);
    }
  }, [searchParams, runCompare]);

  // The shareable link reflects the currently entered hashes and owners, so a
  // recipient lands on the same comparison. Owners are included only when valid.
  const shareComparison = useCallback(async () => {
    if (!isValidHash(aHash) || !isValidHash(bHash)) return;
    const params = new URLSearchParams({ a: aHash, b: bHash });
    const oa = ownerParam(a.owner);
    const ob = ownerParam(b.owner);
    if (oa) params.set("ownerA", oa);
    if (ob) params.set("ownerB", ob);
    if (a.group) {
      params.set("groupA", String(a.group.groupId));
      params.set("giA", String(a.group.index));
    }
    if (b.group) {
      params.set("groupB", String(b.group.groupId));
      params.set("giB", String(b.group.index));
    }
    const url = `${window.location.origin}/compare?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }
    setTimeout(() => setShareState("idle"), 1500);
  }, [aHash, bHash, a.owner, b.owner, a.group, b.group]);

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
            setA((s) => ({
              ...s,
              hash,
              file: null,
              hashError: null,
              group: undefined,
            }))
          }
          onOwnerChange={(owner) => setA((s) => ({ ...s, owner }))}
        />
        <DocColumn
          title={t("compare.columnB")}
          state={b}
          onFile={(f) => void hashColumnFile(f, setB)}
          onHashChange={(hash) =>
            setB((s) => ({
              ...s,
              hash,
              file: null,
              hashError: null,
              group: undefined,
            }))
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
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <h2 className="text-2xl">{t("compare.results.heading")}</h2>
            <button
              onClick={() => void shareComparison()}
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              {shareState === "copied"
                ? t("compare.share.copied")
                : shareState === "failed"
                  ? t("compare.share.failed")
                  : t("compare.share.button")}
            </button>
          </div>
          <ResultsTable comparison={comparison} />
          <Timeline comparison={comparison} />
          <RelationshipBadges comparison={comparison} />
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

// Turns the estimated minute gap into a friendly, localized duration, stepping
// up to hours then days so a large block gap stays readable.
function useHumanizeDuration() {
  const { t } = useI18n();
  return (minutes: number): string => {
    if (minutes < 60) return t("compare.units.minutes", { count: minutes });
    if (minutes < 1440)
      return t("compare.units.hours", { count: Math.round(minutes / 60) });
    return t("compare.units.days", { count: Math.round(minutes / 1440) });
  };
}

// A visual bar plus a sentence describing which document was anchored first and
// by how much. Needs both documents anchored; otherwise it explains why no
// timeline can be drawn.
function Timeline({ comparison }: { comparison: AnchorComparison }) {
  const { t } = useI18n();
  const humanize = useHumanizeDuration();
  const { left, right, timeDelta, olderSide } = comparison;
  const bothFound = left.source !== "none" && right.source !== "none";

  if (!bothFound) {
    return (
      <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-5">
        <h3 className="text-sm uppercase tracking-wide text-foreground/50 mb-2">
          {t("compare.timeline.heading")}
        </h3>
        <p className="text-sm text-foreground/70">
          {t("compare.timeline.unavailable")}
        </p>
      </div>
    );
  }

  const duration = humanize(timeDelta.estimatedMinutes);
  const sameBlock = olderSide === "same";
  const message = sameBlock
    ? t("compare.timeline.sameBlock")
    : olderSide === "left"
      ? t("compare.timeline.aBeforeB", {
          blocks: timeDelta.blocks,
          duration,
        })
      : t("compare.timeline.bBeforeA", {
          blocks: timeDelta.blocks,
          duration,
        });

  // Order the two markers chronologically: the earlier document sits on the
  // left of the bar regardless of which input column it came from.
  const earlierLabel =
    olderSide === "right" ? t("compare.columnB") : t("compare.columnA");
  const laterLabel =
    olderSide === "right" ? t("compare.columnA") : t("compare.columnB");

  return (
    <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-5">
      <h3 className="text-sm uppercase tracking-wide text-foreground/50 mb-3">
        {t("compare.timeline.heading")}
      </h3>
      <p className="text-sm text-foreground/80 mb-4">{message}</p>
      {sameBlock ? (
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full bg-heading" aria-hidden="true" />
            {earlierLabel}
            <span className="text-foreground/30">+</span>
            {laterLabel}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-xs">
          <span className="flex flex-col items-start">
            <span className="h-2.5 w-2.5 rounded-full bg-heading" aria-hidden="true" />
            <span className="mt-1 font-medium">{earlierLabel}</span>
            <span className="text-foreground/50">{t("compare.timeline.earlier")}</span>
          </span>
          <span className="flex-1 h-0.5 bg-foreground/20 rounded" aria-hidden="true" />
          <span className="flex flex-col items-end">
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/40" aria-hidden="true" />
            <span className="mt-1 font-medium">{laterLabel}</span>
            <span className="text-foreground/50">{t("compare.timeline.later")}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// Pill badges summarizing the relationships: shared owner, shared template type,
// and any supersession one label declares over the other. Only shown when both
// documents are anchored, since the comparisons are otherwise meaningless.
function RelationshipBadges({ comparison }: { comparison: AnchorComparison }) {
  const { t } = useI18n();
  const { left, right, sameOwner, sameTemplate, supersedes } = comparison;
  const bothFound = left.source !== "none" && right.source !== "none";
  if (!bothFound) return null;

  const positive =
    "border-green-600/30 text-green-700 dark:text-green-400 bg-green-500/5";
  const neutral = "border-foreground/20 text-foreground/70";

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <span
        className={`text-xs px-3 py-1 rounded-full border ${
          sameOwner ? positive : neutral
        }`}
      >
        {sameOwner
          ? t("compare.badges.sameOwner")
          : t("compare.badges.differentOwners")}
      </span>
      <span
        className={`text-xs px-3 py-1 rounded-full border ${
          sameTemplate ? positive : neutral
        }`}
      >
        {sameTemplate
          ? t("compare.badges.sameTemplate")
          : t("compare.badges.differentTemplates")}
      </span>
      {supersedes && (
        <span className="text-xs px-3 py-1 rounded-full border border-amber-600/40 text-amber-700 dark:text-amber-400 bg-amber-500/5">
          {supersedes === "left"
            ? t("compare.badges.aSupersedesB")
            : t("compare.badges.bSupersedesA")}
        </span>
      )}
    </div>
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
