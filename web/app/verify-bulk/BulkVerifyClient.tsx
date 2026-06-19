"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import CollectionsNavLink from "@/app/components/CollectionsNavLink";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";
import {
  getProofByHash,
  hashFile,
  readAnchor,
  readBatchAnchor,
} from "@/lib/stacks";
import { truncateAddress, useWallet } from "@/lib/wallet";
import { discoverBatchAndGroupAnchors } from "@/lib/search";
import { downloadExport, formatBulkVerifyCSV } from "@/lib/export";
import { stageReportInput } from "@/lib/reportLink";
import SaveToCollectionButton from "@/app/components/SaveToCollectionButton";

type Source = "single" | "batch" | "proof" | "group";

type RowStatus = "checking" | "verified" | "notfound" | "error";

type Row = {
  id: string;
  // The dropped file, or null for a row seeded from a ?hashes= link.
  file: File | null;
  // Display name: the filename, or a truncated hash for file-less rows.
  name: string;
  hash: string | null;
  status: RowStatus;
  source: Source | null;
  block: number | null;
  // Owner principal used for a successful batch lookup. Frozen here so the
  // verify link stays correct even if the wallet later disconnects or switches.
  owner: string | null;
  // The wallet principal used when this row was last resolved (null if none was
  // connected). A "not found" row is re-checked whenever the connected wallet
  // differs from this, since batch records are keyed by {hash, owner}.
  checkedOwner: string | null;
  // Exact verify-page path discovered for a group or other-owner batch anchor,
  // so its Verify link targets the precise on-chain row.
  verifyUrl: string | null;
  message: string | null;
};

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

// Maps a row status to a stable translation key id. The English label lives in
// the dictionary; callers translate at the render/export site.
function statusLabelKey(status: RowStatus): string {
  switch (status) {
    case "verified":
      return "bulkVerify.status.verified";
    case "notfound":
      return "bulkVerify.status.notFound";
    case "error":
      return "bulkVerify.status.error";
    default:
      return "bulkVerify.status.checking";
  }
}

function newId(file: File): string {
  return `${file.name}-${file.size}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export default function BulkVerifyClient() {
  const { t } = useI18n();
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();
  const [rows, setRows] = useState<Row[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Latest rows without forcing the re-resolution effect to depend on `rows`.
  const rowsRef = useRef<Row[]>(rows);
  rowsRef.current = rows;
  // Latest connected owner, read at the moment of the batch lookup so an
  // in-flight resolve that started before the wallet connected still queries
  // the owner-keyed batch contract with the now-current principal.
  const addressRef = useRef<string | null>(address);
  addressRef.current = address;

  // Resolve one already-hashed file against the contracts. Single anchors are
  // global and public, so they come first. The batch contract is keyed by
  // {hash, owner}, so it can only be checked when a wallet is connected.
  // Proof NFTs are global and looked up by hash regardless of wallet.
  //
  // The loop absorbs a wallet change that lands while the reads are in flight:
  // if no match is found and the connected owner changed during the awaits,
  // retry against the new owner before settling. The final notfound write
  // happens synchronously right after confirming the owner is stable, so
  // `checkedOwner` always matches the wallet in effect at settle time.
  const resolve = useCallback(async (id: string, hash: string) => {
    try {
      for (;;) {
        const owner = addressRef.current;

        const single = await readAnchor(hash);
        if (single) {
          setRows((cur) =>
            cur.map((r) =>
              r.id === id
                ? {
                    ...r,
                    status: "verified",
                    source: "single",
                    block: single.stacksBlock,
                    owner: null,
                    checkedOwner: owner,
                  }
                : r,
            ),
          );
          return;
        }

        if (owner) {
          const batch = await readBatchAnchor(hash, owner);
          if (batch) {
            setRows((cur) =>
              cur.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      status: "verified",
                      source: "batch",
                      block: batch.stacksBlock,
                      owner,
                      checkedOwner: owner,
                    }
                  : r,
              ),
            );
            return;
          }
        }

        const proof = await getProofByHash(hash);
        if (proof) {
          setRows((cur) =>
            cur.map((r) =>
              r.id === id
                ? {
                    ...r,
                    status: "verified",
                    source: "proof",
                    block: proof.stacksBlock,
                    owner: null,
                    checkedOwner: owner,
                  }
                : r,
            ),
          );
          return;
        }

        // The wallet changed mid-lookup; retry against the current owner so a
        // batch anchor owned by the new wallet is not missed.
        if (addressRef.current !== owner) continue;

        setRows((cur) =>
          cur.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "notfound",
                  source: null,
                  block: null,
                  owner: null,
                  checkedOwner: owner,
                }
              : r,
          ),
        );
        return;
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("bulkVerify.errors.checkFailed");
      setRows((cur) =>
        cur.map((r) =>
          r.id === id ? { ...r, status: "error", message } : r,
        ),
      );
    }
  }, [t]);

  // Batch records are keyed by {hash, owner}, so a "not found" row only reflects
  // the wallet it was checked against. When the connected wallet changes (first
  // connect, or switching to the wallet that actually owns the record), re-check
  // those rows against the new principal. (Rows still mid-flight are handled by
  // addressRef, which lets their in-flight resolve pick up the new owner.)
  useEffect(() => {
    if (!address) return;
    const needsRecheck = (r: Row) =>
      r.status === "notfound" && !!r.hash && r.checkedOwner !== address;
    const pending = rowsRef.current.filter(needsRecheck);
    if (pending.length === 0) return;
    setRows((cur) =>
      cur.map((r) => (needsRecheck(r) ? { ...r, status: "checking" } : r)),
    );
    pending.forEach((r) => void resolve(r.id, r.hash!));
  }, [address, resolve]);

  // Hashes already swept through batch/group discovery, so the sweep below runs
  // at most once per hash and does not loop when it updates rows.
  const discoveredRef = useRef<Set<string>>(new Set());

  // The per-row resolver above only covers global single/proof anchors and batch
  // anchors owned by the connected wallet. Group anchors, and batch anchors owned
  // by someone else (common when verifying a shared collection), need the event
  // stream discovery used by search. Once every row has settled, sweep the
  // not-found ones through one shared discovery scan and promote any that resolve.
  useEffect(() => {
    const stillResolving = rows.some(
      (r) => r.status === "checking" || (r.file !== null && r.hash === null),
    );
    if (stillResolving) return;
    const pending = rows.filter(
      (r) =>
        r.status === "notfound" &&
        !!r.hash &&
        !discoveredRef.current.has(r.hash),
    );
    if (pending.length === 0) return;
    pending.forEach((r) => discoveredRef.current.add(r.hash!));
    let cancelled = false;
    void (async () => {
      try {
        const found = await discoverBatchAndGroupAnchors(
          pending.map((r) => r.hash!),
        );
        if (cancelled || found.size === 0) return;
        setRows((cur) =>
          cur.map((r) => {
            const res = r.hash ? found.get(r.hash) : undefined;
            if (r.status !== "notfound" || !res) return r;
            return {
              ...r,
              status: "verified",
              source: res.source === "group" ? "group" : "batch",
              block: res.stacksBlock,
              owner: res.source === "batch" ? res.owner : null,
              verifyUrl: res.verifyUrl,
            };
          }),
        );
      } catch {
        // Discovery is best-effort; leave rows as not-found on a scan failure.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming) return;
      const files = Array.from(incoming);
      if (files.length === 0) return;
      const newRows: Row[] = files.map((file) => ({
        id: newId(file),
        file,
        name: file.name,
        hash: null,
        status: "checking",
        source: null,
        block: null,
        owner: null,
        checkedOwner: null,
        verifyUrl: null,
        message: null,
      }));
      setRows((prev) => [...prev, ...newRows]);
      newRows.forEach((row) => {
        if (!row.file) return;
        hashFile(row.file)
          .then((hash) => {
            setRows((cur) =>
              cur.map((r) => (r.id === row.id ? { ...r, hash } : r)),
            );
            void resolve(row.id, hash);
          })
          .catch((e: unknown) => {
            const message =
              e instanceof Error ? e.message : t("bulkVerify.errors.hashFailed");
            setRows((cur) =>
              cur.map((r) =>
                r.id === row.id ? { ...r, status: "error", message } : r,
              ),
            );
          });
      });
    },
    [resolve, t],
  );

  // Seeds file-less rows from a list of already-known hashes, deduping against
  // rows already present. Used by the ?hashes= link a collection's "Verify All"
  // navigates to.
  const addHashes = useCallback(
    (hashes: string[]) => {
      const existing = new Set(
        rowsRef.current.map((r) => r.hash).filter((h): h is string => !!h),
      );
      const fresh = hashes
        .map((h) => h.trim().toLowerCase().replace(/^0x/, ""))
        .filter((h) => /^[0-9a-f]{64}$/.test(h))
        .filter((h, i, arr) => arr.indexOf(h) === i && !existing.has(h));
      if (fresh.length === 0) return;
      const newRows: Row[] = fresh.map((hash) => ({
        id: `${hash}-${Math.random().toString(36).slice(2, 8)}`,
        file: null,
        name: truncateHash(hash),
        hash,
        status: "checking",
        source: null,
        block: null,
        owner: null,
        checkedOwner: null,
        verifyUrl: null,
        message: null,
      }));
      setRows((prev) => [...prev, ...newRows]);
      newRows.forEach((row) => void resolve(row.id, row.hash!));
    },
    [resolve],
  );

  // Read a ?hashes= link once on mount (a collection's "Verify All" lands here).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("hashes");
    if (raw) addHashes(raw.split(/[\s,]+/).filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 1500);
    } catch {
      // Clipboard can be blocked; ignore and let the user copy manually.
    }
  };

  const clearAll = () => {
    discoveredRef.current.clear();
    setRows([]);
  };

  const exportResults = () => {
    if (rows.length === 0) return;
    const csv = formatBulkVerifyCSV(
      rows.map((r) => ({
        filename: r.name,
        hash: r.hash,
        status: t(statusLabelKey(r.status)),
        source: r.source,
        block: r.block,
      })),
    );
    downloadExport(
      csv,
      `thesislock-bulk-verify-${Date.now()}.csv`,
      "text/csv;charset=utf-8",
    );
  };

  const total = rows.length;
  const verifiedCount = rows.filter((r) => r.status === "verified").length;
  const settledCount = rows.filter((r) => r.status !== "checking").length;
  const progress = total === 0 ? 0 : Math.round((settledCount / total) * 100);

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
          <span className="text-foreground font-medium">{t("common.nav.bulkVerify")}</span>
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
        {address ? (
          <button
            onClick={disconnectWallet}
            className="text-sm font-mono px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            title={t("common.wallet.disconnect")}
            aria-label={t("common.wallet.disconnectAria")}
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

      <h1 className="text-3xl mb-2">{t("bulkVerify.heading")}</h1>
      <p className="text-foreground/70 mb-8">
        {t("bulkVerify.intro")}
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label={t("bulkVerify.dropzone.aria")}
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
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
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
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="text-foreground/60">
          {t("bulkVerify.dropzone.label")}
        </p>
      </div>

      {rows.length > 0 && (
        <div className="mt-8">
          <div className="rounded-lg border border-foreground/10 bg-card p-4 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm font-medium" aria-live="polite">
                {total === 1
                  ? t("bulkVerify.summary.verifiedOne", {
                      verified: verifiedCount,
                      total,
                    })
                  : t("bulkVerify.summary.verifiedMany", {
                      verified: verifiedCount,
                      total,
                    })}
                {settledCount < total
                  ? t("bulkVerify.summary.checkingSuffix", {
                      count: total - settledCount,
                    })
                  : ""}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={exportResults}
                  className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                >
                  {t("bulkVerify.actions.export")}
                </button>
                {settledCount === total && (
                  <Link
                    href="/report"
                    onClick={() =>
                      stageReportInput(
                        rows
                          .filter((r) => r.hash)
                          .map((r) => ({ hash: r.hash as string, filename: r.name })),
                      )
                    }
                    className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                  >
                    {t("bulkVerify.actions.generateReport")}
                  </Link>
                )}
                {rows.some((r) => r.status === "verified" && r.hash) && (
                  <SaveToCollectionButton
                    triggerLabel="Save verified to collection"
                    items={rows
                      .filter((r) => r.status === "verified" && r.hash)
                      .map((r) => ({
                        hash: r.hash as string,
                        label: r.name,
                        verifyUrl:
                          r.verifyUrl ??
                          (r.source === "batch" && r.owner
                            ? `/v/${r.hash}?owner=${encodeURIComponent(r.owner)}`
                            : undefined),
                      }))}
                  />
                )}
                <button
                  onClick={clearAll}
                  className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                >
                  {t("bulkVerify.actions.clearAll")}
                </button>
              </div>
            </div>
            <div
              className="mt-3 h-1.5 w-full rounded-full bg-foreground/10 overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-heading transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <h2 className="text-lg mb-4">{t("bulkVerify.results.heading")}</h2>

          <div className="space-y-3" role="list">
            {rows.map((row) => (
              <div
                key={row.id}
                role="listitem"
                className="rounded-lg border border-foreground/10 bg-card p-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {row.name}
                    </div>
                    {row.hash ? (
                      <div className="mt-1 flex items-center gap-2">
                        <code className="font-mono text-xs">
                          {truncateHash(row.hash)}
                        </code>
                        <button
                          onClick={() => void copyHash(row.hash!)}
                          aria-label={t("bulkVerify.row.copyHashAria")}
                          className="text-xs px-2 py-0.5 rounded border border-foreground/15 hover:border-foreground/40 transition"
                        >
                          {copiedHash === row.hash
                            ? t("common.actions.copied")
                            : t("common.actions.copy")}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-foreground/50 font-mono">
                        {t("bulkVerify.row.hashing")}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    {row.status === "checking" ? (
                      <span className="text-foreground/50">{t("bulkVerify.row.checking")}</span>
                    ) : row.status === "verified" ? (
                      <span className="text-green-700 dark:text-green-400">{t("bulkVerify.status.verified")} &#10003;</span>
                    ) : row.status === "notfound" ? (
                      <span className="text-red-600 dark:text-red-400">{t("bulkVerify.status.notFound")} &#10007;</span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">{t("bulkVerify.status.error")}</span>
                    )}
                  </div>
                </div>

                {row.status === "error" && row.message && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{row.message}</p>
                )}

                {(row.source || row.block !== null || row.hash) && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        {t("bulkVerify.row.source")}
                      </div>
                      <code className="font-mono text-xs">
                        {row.source ?? "-"}
                      </code>
                    </div>
                    <div>
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        {t("bulkVerify.row.stacksBlock")}
                      </div>
                      <code className="font-mono text-xs">
                        {row.block !== null ? row.block : "-"}
                      </code>
                    </div>
                    <div className="sm:text-right">
                      {row.status === "verified" && row.hash && (
                        <Link
                          href={
                            row.verifyUrl
                              ? row.verifyUrl
                              : row.source === "batch" && row.owner
                                ? `/v/${row.hash}?owner=${encodeURIComponent(row.owner)}`
                                : `/v/${row.hash}`
                          }
                          aria-label={t("bulkVerify.row.verifyAria", {
                            name: row.name,
                          })}
                          className="inline-flex text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                        >
                          {t("bulkVerify.row.verifyLink")} &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
