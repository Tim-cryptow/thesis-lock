"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import Footer from "@/app/components/Footer";
import { useI18n } from "@/app/components/I18nProvider";
import { truncateAddress, useWallet } from "@/lib/wallet";
import { hashFile } from "@/lib/stacks";
import { fetchAllAnchors } from "@/lib/fetchAllAnchors";
import type { RegistryEntry } from "@/lib/stacks";
import {
  DEFAULT_REPORT_TITLE,
  MAX_REPORT_HASHES,
  generateReport,
  type HashInput,
  type ReportData,
  type ReportEntry,
} from "@/lib/report";
import { verifyUrlFor } from "@/lib/reportRenderer";
import { REPORT_INPUT_KEY } from "@/lib/reportLink";
import ReportActions from "./ReportActions";

const SOURCE_LABELS: Record<string, string> = {
  single: "Single anchor",
  batch: "Batch anchor",
  group: "Group anchor",
  registry: "Registry",
  proof: "Proof NFT",
};

function entryLabel(entry: ReportEntry): string {
  if (!entry.label) return "(none)";
  const fields = entry.template?.fields;
  if (fields) {
    const parts = Object.entries(fields)
      .filter(([key]) => key !== "label")
      .map(([key, value]) => `${key}: ${value}`);
    if (parts.length > 0) return parts.join(", ");
  }
  return entry.label;
}

const HEX_64 = /^[0-9a-f]{64}$/;

type InputTab = "drop" | "paste" | "import";

function normalize(raw: string): string {
  const v = raw.trim().toLowerCase();
  return v.startsWith("0x") ? v.slice(2) : v;
}

export default function ReportClient() {
  const { t } = useI18n();
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();

  const [title, setTitle] = useState(DEFAULT_REPORT_TITLE);
  const [tab, setTab] = useState<InputTab>("drop");
  const [items, setItems] = useState<HashInput[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [hashing, setHashing] = useState(false);

  // Import-from-anchors state.
  const [anchors, setAnchors] = useState<RegistryEntry[]>([]);
  const [anchorsLoading, setAnchorsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Generation state. generationId tags each run so that an in-flight
  // generateReport can be abandoned when the inputs change underneath it (see
  // the invalidation effect and generate below).
  const [generating, setGenerating] = useState(false);
  const [statuses, setStatuses] = useState<("pending" | "verified" | "notfound")[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<ReportData | null>(null);
  const generationId = useRef(0);

  // Adds hashes, skipping duplicates and anything not a valid 64-hex string, and
  // enforcing the same per-report cap as the API so the builder cannot stage a
  // list that the server would reject (or that would hammer the Hiro API).
  const addItems = useCallback((incoming: HashInput[]) => {
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.hash));
      const next = [...prev];
      for (const item of incoming) {
        if (next.length >= MAX_REPORT_HASHES) break;
        const hash = normalize(item.hash);
        if (!HEX_64.test(hash) || seen.has(hash)) continue;
        seen.add(hash);
        next.push({ hash, ...(item.filename ? { filename: item.filename } : {}) });
      }
      return next;
    });
  }, []);

  // Read a handoff list (from anchors, bulk verify, groups) or a shared
  // ?hashes= link once on mount.
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = window.sessionStorage.getItem(REPORT_INPUT_KEY);
      if (raw) {
        window.sessionStorage.removeItem(REPORT_INPUT_KEY);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) addItems(parsed as HashInput[]);
      }
    } catch {
      // Ignore malformed handoff payloads.
    }
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("hashes");
    if (fromUrl) {
      addItems(fromUrl.split(",").map((hash) => ({ hash })));
    }
    const urlTitle = params.get("title");
    if (urlTitle) setTitle(urlTitle);
  }, [addItems]);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setHashing(true);
      try {
        const hashed = await Promise.all(
          files.map(async (file) => ({
            hash: await hashFile(file),
            filename: file.name,
          })),
        );
        addItems(hashed);
      } catch {
        // A file that cannot be read is skipped silently; the rest still add.
      } finally {
        setHashing(false);
      }
    },
    [addItems],
  );

  const addPasted = useCallback(() => {
    const lines = pasteText
      .split(/[\s,]+/)
      .map((line) => line.trim())
      .filter(Boolean);
    addItems(lines.map((hash) => ({ hash })));
    setPasteText("");
  }, [pasteText, addItems]);

  const removeItem = useCallback((hash: string) => {
    setItems((prev) => prev.filter((i) => i.hash !== hash));
  }, []);

  const clearItems = useCallback(() => setItems([]), []);

  // A generated report describes one specific document list resolved against one
  // connected wallet (the owner used for batch resolution and generatedBy). If
  // either changes (list cleared/removed/added, or the wallet switches), drop the
  // stale report and progress so the preview and Download/Print/Share actions can
  // never export results that no longer match the builder. Bumping generationId
  // also abandons any run still in flight so its result is never published.
  useEffect(() => {
    generationId.current += 1;
    setReport(null);
    setStatuses([]);
    setProgress({ done: 0, total: 0 });
  }, [items, address]);

  const loadAnchors = useCallback(async () => {
    if (!address) return;
    setAnchorsLoading(true);
    try {
      const entries = await fetchAllAnchors(address);
      setAnchors(entries);
    } catch {
      setAnchors([]);
    } finally {
      setAnchorsLoading(false);
    }
  }, [address]);

  // Drop previously loaded anchors when the wallet changes so the import list
  // reflects the connected wallet rather than a stale one. The load effect below
  // then refetches for the new wallet.
  useEffect(() => {
    setAnchors([]);
    setSelected(new Set());
  }, [address]);

  useEffect(() => {
    if (tab === "import" && address && anchors.length === 0 && !anchorsLoading) {
      void loadAnchors();
    }
  }, [tab, address, anchors.length, anchorsLoading, loadAnchors]);

  const toggleSelected = useCallback((hash: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(hash)) next.delete(hash);
      else next.add(hash);
      return next;
    });
  }, []);

  const addSelectedAnchors = useCallback(() => {
    const chosen = anchors
      .filter((a) => selected.has(a.hash.toLowerCase()))
      .map((a) => ({ hash: a.hash }));
    addItems(chosen);
    setSelected(new Set());
  }, [anchors, selected, addItems]);

  const generate = useCallback(async () => {
    if (items.length === 0 || generating) return;
    const runId = (generationId.current += 1);
    setGenerating(true);
    setReport(null);
    setStatuses(items.map(() => "pending"));
    setProgress({ done: 0, total: items.length });
    const data = await generateReport(
      items,
      address ?? undefined,
      (done, total, entry, index) => {
        // Ignore progress from a run the inputs have since invalidated.
        if (generationId.current !== runId) return;
        setProgress({ done, total });
        setStatuses((prev) => {
          const next = [...prev];
          next[index] = entry.verified ? "verified" : "notfound";
          return next;
        });
      },
    );
    // Only publish if this run still describes the current inputs and wallet.
    if (generationId.current === runId) {
      setReport({ ...data, title: title.trim() || DEFAULT_REPORT_TITLE });
    }
    setGenerating(false);
  }, [items, generating, address, title]);

  return (
    <>
      <div className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="order-last ml-auto">
              <ThemeToggle />
            </div>
            <Link href="/" className="text-foreground/60 hover:text-foreground">
              {t("common.nav.back")}
            </Link>
            <Link href="/anchors" className="text-foreground/60 hover:text-foreground">
              {t("common.nav.myAnchors")}
            </Link>
            <Link href="/verify-bulk" className="text-foreground/60 hover:text-foreground">
              {t("common.nav.bulkVerify")}
            </Link>
            <Link href="/dashboard" className="text-foreground/60 hover:text-foreground">
              {t("common.nav.dashboard")}
            </Link>
            <span className="text-foreground font-medium">{t("common.nav.report")}</span>
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

        <header className="mb-8">
          <h1 className="text-3xl mb-2">Verification Report</h1>
          <p className="text-foreground/70 max-w-2xl">
            Build a formal, multi-document report proving a set of hashes were
            anchored on the Stacks blockchain. Export it as HTML, JSON, or CSV.
          </p>
        </header>

        <label className="block text-sm font-medium mb-6">
          Report title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={DEFAULT_REPORT_TITLE}
            className="mt-1.5 w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
        </label>

        <div role="tablist" aria-label="Add hashes" className="flex flex-wrap gap-1 border-b border-foreground/10">
          {([
            ["drop", "Drop files"],
            ["paste", "Paste hashes"],
            ["import", "Import from My Anchors"],
          ] as [InputTab, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
                tab === id
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-foreground/60 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "drop" ? (
            <MultiFileDrop onFiles={addFiles} hashing={hashing} />
          ) : null}

          {tab === "paste" ? (
            <div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={5}
                placeholder="One 64-character hash per line"
                className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 font-mono text-sm outline-none focus:border-foreground/40"
              />
              <button
                type="button"
                onClick={addPasted}
                disabled={!pasteText.trim()}
                className="mt-2 rounded-md border border-foreground/15 px-3 py-2 text-sm hover:border-foreground/40 disabled:opacity-40"
              >
                Add hashes
              </button>
            </div>
          ) : null}

          {tab === "import" ? (
            <div>
              {!address ? (
                <p className="text-sm text-foreground/60">
                  Connect your wallet to import anchors from your registry.
                </p>
              ) : anchorsLoading ? (
                <p className="text-sm text-foreground/60">Loading your anchors...</p>
              ) : anchors.length === 0 ? (
                <p className="text-sm text-foreground/60">No anchors found for this wallet.</p>
              ) : (
                <div>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-foreground/10">
                    {anchors.map((anchor) => {
                      const hash = anchor.hash.toLowerCase();
                      return (
                        <label
                          key={hash}
                          className="flex items-center gap-3 border-b border-foreground/5 px-3 py-2 text-sm last:border-0 hover:bg-foreground/5"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(hash)}
                            onChange={() => toggleSelected(hash)}
                            className="accent-foreground"
                          />
                          <code className="font-mono text-xs text-foreground/70">
                            {hash.slice(0, 16)}...
                          </code>
                          <span className="truncate text-foreground/60">
                            {anchor.label || "(no label)"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={addSelectedAnchors}
                    disabled={selected.size === 0}
                    className="mt-2 rounded-md border border-foreground/15 px-3 py-2 text-sm hover:border-foreground/40 disabled:opacity-40"
                  >
                    Add selected ({selected.size})
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Documents ({items.length})</h2>
            {items.length > 0 ? (
              <button
                type="button"
                onClick={clearItems}
                className="text-xs text-foreground/50 hover:text-foreground"
              >
                Clear all
              </button>
            ) : null}
          </div>
          {items.length >= MAX_REPORT_HASHES ? (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Limit of {MAX_REPORT_HASHES} documents reached. Any additional
              hashes were not added, so this report covers only the first{" "}
              {MAX_REPORT_HASHES}. Split the rest into separate reports to cover
              them all.
            </p>
          ) : null}
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-foreground/50">
              No documents yet. Drop files, paste hashes, or import from your anchors.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1">
              {items.map((item) => (
                <li
                  key={item.hash}
                  className="flex items-center gap-3 rounded-md border border-foreground/10 px-3 py-2 text-sm"
                >
                  <code className="font-mono text-xs text-foreground/70">
                    {item.hash.slice(0, 18)}...
                  </code>
                  {item.filename ? (
                    <span className="truncate text-foreground/60">{item.filename}</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeItem(item.hash)}
                    className="ml-auto text-foreground/40 hover:text-foreground"
                    aria-label="Remove document"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={items.length === 0 || generating}
            className="mt-6 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generating
              ? `Verifying ${progress.done} of ${progress.total} hashes...`
              : "Generate report"}
          </button>
        </section>

        {generating || statuses.length > 0 ? (
          <section className="mt-8" aria-label="Verification progress">
            <div className="flex items-center justify-between text-sm text-foreground/70">
              <span>
                {generating
                  ? `Verifying ${progress.done} of ${progress.total} hashes...`
                  : `Verified ${progress.total} hashes`}
              </span>
              <span>
                {progress.total > 0
                  ? Math.round((progress.done / progress.total) * 100)
                  : 0}
                %
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full bg-foreground transition-all"
                style={{
                  width: `${
                    progress.total > 0
                      ? (progress.done / progress.total) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <ul className="mt-3 flex flex-col gap-1">
              {items.map((item, index) => {
                const status = statuses[index] ?? "pending";
                return (
                  <li
                    key={item.hash}
                    className="flex items-center gap-3 text-xs"
                  >
                    <StatusIcon status={status} />
                    <code className="font-mono text-foreground/60">
                      {item.hash.slice(0, 18)}...
                    </code>
                    {item.filename ? (
                      <span className="truncate text-foreground/50">
                        {item.filename}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {report ? <ReportPreview data={report} /> : null}
        {report ? <ReportActions data={report} /> : null}
      </div>
      <Footer />
    </>
  );
}

function MultiFileDrop({
  onFiles,
  hashing,
}: {
  onFiles: (files: File[]) => void;
  hashing: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const files = Array.from(e.dataTransfer.files ?? []);
        if (files.length > 0) onFiles(files);
      }}
      className={`rounded-lg border-2 border-dashed p-10 text-center transition outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 cursor-pointer ${
        dragOver
          ? "border-foreground/60 bg-foreground/5"
          : "border-foreground/20 hover:border-foreground/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFiles(files);
          e.target.value = "";
        }}
      />
      <p className="text-foreground/60">
        {hashing
          ? "Hashing files..."
          : "Drop files here, or click to choose. Files are hashed in your browser and never uploaded."}
      </p>
    </div>
  );
}

function StatusIcon({
  status,
}: {
  status: "pending" | "verified" | "notfound";
}) {
  if (status === "verified") {
    return <span className="text-emerald-600 dark:text-emerald-400" aria-label="Verified">✓</span>;
  }
  if (status === "notfound") {
    return <span className="text-red-600 dark:text-red-400" aria-label="Not found">✕</span>;
  }
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/70"
      aria-label="Checking"
    />
  );
}

function ReportPreview({ data }: { data: ReportData }) {
  const { summary } = data;
  return (
    <section className="mt-10" aria-label="Report preview">
      <h2 className="text-lg mb-4">Report preview</h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={summary.total} tone="neutral" />
        <Stat label="Verified" value={summary.verified} tone="ok" />
        <Stat label="Not found" value={summary.notFound} tone="no" />
        <Stat label="Sources" value={Object.keys(summary.sources).length} tone="neutral" />
      </div>

      {Object.keys(summary.sources).length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(summary.sources).map(([source, count]) => (
            <span
              key={source}
              className="rounded bg-foreground/10 px-2 py-1 text-xs text-foreground/70"
            >
              {(SOURCE_LABELS[source] ?? source)}: {count}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 max-h-128 overflow-y-auto rounded-lg border border-foreground/10 divide-y divide-foreground/10">
        {data.hashes.map((entry, index) => (
          <article key={`${entry.hash}-${index}`} className="p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs">
                {index + 1}
              </span>
              {entry.verified ? (
                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Verified
                </span>
              ) : (
                <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                  Not found
                </span>
              )}
              {entry.filename ? (
                <span className="truncate text-sm text-foreground/70">
                  {entry.filename}
                </span>
              ) : null}
            </div>
            <code className="mt-2 block break-all font-mono text-xs text-foreground/70">
              {entry.hash}
            </code>
            {entry.verified ? (
              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <Field label="Source" value={SOURCE_LABELS[entry.source ?? ""] ?? entry.source ?? "-"} />
                <Field label="Stacks block" value={entry.block !== null ? String(entry.block) : "-"} />
                <Field label="Label" value={entryLabel(entry)} />
                <Field label="Proof NFT" value={entry.proofNFT !== null ? `#${entry.proofNFT}` : "None"} />
                <Field label="Owner" value={entry.owner ?? "-"} mono />
              </dl>
            ) : null}
            <a
              href={verifyUrlFor(entry)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
            >
              Verify on chain
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "ok" | "no";
}) {
  const color =
    tone === "ok"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "no"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";
  return (
    <div className="rounded-lg border border-foreground/10 p-3 text-center">
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-foreground/50">{label}</div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <dt className="text-foreground/50">{label}:</dt>
      <dd className={`min-w-0 break-all text-foreground/80 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
