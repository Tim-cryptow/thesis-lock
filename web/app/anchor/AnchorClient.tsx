"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BATCH_CONTRACT_FULL_NAME,
  SINGLE_CONTRACT_NAME,
  explorerTxUrl,
  hashFile,
  mintProof,
  readAnchor,
  readBatchAnchor,
  registerAnchor,
  submitAnchor,
  submitBatchAnchor,
} from "@/lib/stacks";
import { truncateAddress, useWallet } from "@/lib/wallet";
import { downloadCertificate } from "@/lib/downloadCertificate";
import { formatBytes } from "@/lib/format";
import FileDropZone from "@/app/components/FileDropZone";

const ASCII_REGEX = /^[\x20-\x7E]*$/;
const MAX_BATCH = 10;

type Mode = "single" | "batch";

type BatchRow = {
  id: string;
  file: File;
  hash: string | null;
  hashing: boolean;
  hashError: string | null;
  label: string;
  labelError: string | null;
};

type RegisterProgress = { current: number; total: number };

type BatchSuccessEntry = { hash: string; label: string };
// thesislock-batch keys entries by tx-sender, so we freeze the submitting
// owner at submit time. Reading live `address` later would break the link
// if the user disconnects or switches accounts before clicking. We also
// thread the batch txId through so the verify page can poll for the pending
// transaction instead of reporting a false-negative "not anchored".
type BatchSuccess = {
  owner: string;
  txId: string;
  entries: BatchSuccessEntry[];
};

type SingleSuccess = {
  hash: string;
  label: string;
  owner: string;
  txId: string;
};

function validateLabel(next: string): {
  value: string;
  error: string | null;
} {
  if (!ASCII_REGEX.test(next)) {
    return { value: next.slice(0, 64), error: "Labels must be ASCII only." };
  }
  return { value: next.slice(0, 64), error: null };
}

function truncateHashShort(h: string) {
  return h.length <= 14 ? h : `${h.slice(0, 8)}...${h.slice(-6)}`;
}

export default function AnchorPage() {
  const {
    address,
    connecting,
    error: walletError,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const [mode, setMode] = useState<Mode>("single");

  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const [rows, setRows] = useState<BatchRow[]>([]);
  const [batchDragOver, setBatchDragOver] = useState(false);
  const [batchLimitNotice, setBatchLimitNotice] = useState<string | null>(null);
  const batchInput = useRef<HTMLInputElement | null>(null);

  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registerProgress, setRegisterProgress] =
    useState<RegisterProgress | null>(null);

  const [batchSuccess, setBatchSuccess] = useState<BatchSuccess | null>(null);
  const [singleSuccess, setSingleSuccess] = useState<SingleSuccess | null>(
    null,
  );
  const [copiedLinkHash, setCopiedLinkHash] = useState<string | null>(null);
  const [copyLinkFailedHash, setCopyLinkFailedHash] = useState<string | null>(
    null,
  );
  const [certBusyHash, setCertBusyHash] = useState<string | null>(null);
  const [certNoticeHash, setCertNoticeHash] = useState<string | null>(null);

  const [minting, setMinting] = useState(false);
  const [mintProgress, setMintProgress] = useState<RegisterProgress | null>(
    null,
  );
  const [mintTxId, setMintTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [pending]);

  const onFileSelect = useCallback(async (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setHash(null);
    setHashError(null);
    setHashing(true);
    try {
      const h = await hashFile(selected);
      setHash(h);
    } catch (e) {
      setHashError(
        e instanceof Error ? e.message : "Could not hash this file.",
      );
    } finally {
      setHashing(false);
    }
  }, []);

  const onLabelChange = (next: string) => {
    const { value, error } = validateLabel(next);
    setLabel(value);
    setLabelError(error);
  };

  const copyHash = async () => {
    if (!hash) return;
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 1500);
    }
  };

  const addBatchFiles = useCallback((incoming: FileList | File[] | null) => {
    if (!incoming) return;
    const incomingArr = Array.from(incoming);
    setBatchLimitNotice(null);
    setRows((prev) => {
      const remaining = MAX_BATCH - prev.length;
      if (remaining <= 0) {
        setBatchLimitNotice(`Limit is ${MAX_BATCH} files per batch.`);
        return prev;
      }
      const accepted = incomingArr.slice(0, remaining);
      if (incomingArr.length > accepted.length) {
        setBatchLimitNotice(
          `Only added ${accepted.length} of ${incomingArr.length}. Limit is ${MAX_BATCH} per batch.`,
        );
      }
      const newRows: BatchRow[] = accepted.map((f) => ({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        hash: null,
        hashing: true,
        hashError: null,
        label: "",
        labelError: null,
      }));
      newRows.forEach((row) => {
        hashFile(row.file)
          .then((h) => {
            setRows((current) =>
              current.map((r) =>
                r.id === row.id
                  ? { ...r, hash: h, hashing: false, hashError: null }
                  : r,
              ),
            );
          })
          .catch((e: unknown) => {
            const message =
              e instanceof Error ? e.message : "Could not hash this file.";
            setRows((current) =>
              current.map((r) =>
                r.id === row.id
                  ? { ...r, hash: null, hashing: false, hashError: message }
                  : r,
              ),
            );
          });
      });
      return [...prev, ...newRows];
    });
  }, []);

  const onBatchDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setBatchDragOver(false);
      addBatchFiles(e.dataTransfer.files);
    },
    [addBatchFiles],
  );

  const updateRowLabel = (id: string, next: string) => {
    const { value, error } = validateLabel(next);
    setRows((current) =>
      current.map((r) =>
        r.id === id ? { ...r, label: value, labelError: error } : r,
      ),
    );
  };

  const removeRow = (id: string) => {
    setRows((current) => current.filter((r) => r.id !== id));
  };

  const registerSequentially = useCallback(
    (
      list: { hash: string; label: string }[],
      idx: number,
      onAllDone: () => void,
      onAbort: () => void,
    ) => {
      if (idx >= list.length) {
        setRegisterProgress(null);
        onAllDone();
        return;
      }
      setRegisterProgress({ current: idx + 1, total: list.length });
      registerAnchor(
        list[idx].hash,
        list[idx].label,
        () => registerSequentially(list, idx + 1, onAllDone, onAbort),
        () => {
          setRegisterProgress(null);
          onAbort();
        },
      );
    },
    [],
  );

  const canSubmitSingle =
    !!hash && !labelError && !!address && !pending && !hashing;

  const submitSingle = () => {
    if (!hash || !address) return;
    const submittingHash = hash;
    const submittingLabel = label;
    const submittingOwner = address;
    setSubmitError(null);
    setPending(true);
    submitAnchor(hash, label, {
      onFinish: (txId) => {
        registerSequentially(
          [{ hash: submittingHash, label: submittingLabel }],
          0,
          () => {
            setPending(false);
            setSingleSuccess({
              hash: submittingHash,
              label: submittingLabel,
              owner: submittingOwner,
              txId,
            });
          },
          () => {
            setPending(false);
            setSingleSuccess({
              hash: submittingHash,
              label: submittingLabel,
              owner: submittingOwner,
              txId,
            });
          },
        );
      },
      onCancel: () => setPending(false),
      onError: (message) => {
        setPending(false);
        setSubmitError(message);
      },
    });
  };

  const allRowsReady =
    rows.length > 0 &&
    rows.every((r) => r.hash && !r.hashing && !r.labelError);
  const canSubmitBatch = allRowsReady && !!address && !pending;

  const submitBatch = () => {
    if (!canSubmitBatch || !address) return;
    const entries = rows.map((r) => ({ hash: r.hash!, label: r.label }));
    const submittingOwner = address;
    setSubmitError(null);
    setPending(true);
    submitBatchAnchor(
      entries,
      (txId) => {
        registerSequentially(
          entries,
          0,
          () => {
            setPending(false);
            setBatchSuccess({ owner: submittingOwner, txId, entries });
          },
          () => {
            setPending(false);
            setBatchSuccess({ owner: submittingOwner, txId, entries });
          },
        );
      },
      () => setPending(false),
    );
  };

  const copyVerifyLink = async (hash: string, owner: string, txId: string) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/v/${hash}?owner=${encodeURIComponent(owner)}&tx=${encodeURIComponent(txId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkHash(hash);
      setTimeout(() => setCopiedLinkHash(null), 1500);
    } catch {
      setCopyLinkFailedHash(hash);
      setTimeout(() => setCopyLinkFailedHash(null), 1500);
    }
  };

  const startAnotherBatch = () => {
    setBatchSuccess(null);
    setRows([]);
    setSubmitError(null);
    setMintTxId(null);
    setMintProgress(null);
  };

  const startAnotherSingle = () => {
    setSingleSuccess(null);
    setFile(null);
    setHash(null);
    setLabel("");
    setSubmitError(null);
    setMintTxId(null);
    setMintProgress(null);
  };

  // Proof minting is an optional, separate wallet signature after the anchor
  // already landed. Duplicate hashes are rejected on chain (err u409), so the
  // wallet surfaces the failure; we just report it without blocking the flow.
  const mintSingleProof = (entryHash: string, entryLabel: string) => {
    setMinting(true);
    mintProof(
      entryHash,
      entryLabel,
      (txId) => {
        setMinting(false);
        setMintTxId(txId);
      },
      () => setMinting(false),
    );
  };

  const mintProofsSequentially = useCallback(
    (list: { hash: string; label: string }[], idx: number) => {
      if (idx >= list.length) {
        setMintProgress(null);
        setMinting(false);
        return;
      }
      setMintProgress({ current: idx + 1, total: list.length });
      mintProof(
        list[idx].hash,
        list[idx].label,
        (txId) => {
          setMintTxId(txId);
          mintProofsSequentially(list, idx + 1);
        },
        () => {
          setMintProgress(null);
          setMinting(false);
        },
      );
    },
    [],
  );

  const mintBatchProofs = (entries: BatchSuccessEntry[]) => {
    setMinting(true);
    mintProofsSequentially(entries, 0);
  };

  // Block heights for the cert only exist after the tx is mined. Read the
  // live anchor at download time and surface a transient notice if it has
  // not been confirmed yet.
  const downloadSingleCert = async (
    entryHash: string,
    entryLabel: string,
    owner: string,
  ) => {
    setCertNoticeHash(null);
    setCertBusyHash(entryHash);
    try {
      const result = await readAnchor(entryHash);
      if (!result) {
        setCertNoticeHash(entryHash);
        setTimeout(() => setCertNoticeHash(null), 4000);
        return;
      }
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      downloadCertificate({
        hash: entryHash,
        label: result.label || entryLabel,
        owner: result.anchoredBy,
        stacksBlock: result.stacksBlock,
        burnBlock: result.burnBlock,
        timestamp: new Date().toISOString(),
        contractName: SINGLE_CONTRACT_NAME,
        verifyUrl: `${origin}/v/${entryHash}`,
      });
    } finally {
      setCertBusyHash(null);
    }
  };

  const downloadBatchCert = async (
    entryHash: string,
    entryLabel: string,
    owner: string,
    txId: string,
  ) => {
    setCertNoticeHash(null);
    setCertBusyHash(entryHash);
    try {
      const result = await readBatchAnchor(entryHash, owner);
      if (!result) {
        setCertNoticeHash(entryHash);
        setTimeout(() => setCertNoticeHash(null), 4000);
        return;
      }
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      downloadCertificate({
        hash: entryHash,
        label: result.label || entryLabel,
        owner,
        stacksBlock: result.stacksBlock,
        burnBlock: result.burnBlock,
        timestamp: new Date().toISOString(),
        contractName: BATCH_CONTRACT_FULL_NAME,
        verifyUrl: `${origin}/v/${entryHash}?owner=${encodeURIComponent(owner)}&tx=${encodeURIComponent(txId)}`,
      });
    } finally {
      setCertBusyHash(null);
    }
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            &larr; ThesisLock
          </Link>
          <span className="text-foreground font-medium">Anchor</span>
          <Link
            href="/anchors"
            className="text-foreground/60 hover:text-foreground"
          >
            My Anchors
          </Link>
          <Link
            href="/feed"
            className="text-foreground/60 hover:text-foreground"
          >
            Feed
          </Link>
          <Link
            href="/stats"
            className="text-foreground/60 hover:text-foreground"
          >
            Stats
          </Link>
          <Link
            href="/verify-bulk"
            className="text-foreground/60 hover:text-foreground"
          >
            Bulk Verify
          </Link>
        </div>
        {address ? (
          <button
            onClick={disconnectWallet}
            className="text-sm font-mono px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            title="Disconnect"
            aria-label="Disconnect wallet"
          >
            {truncateAddress(address)}
          </button>
        ) : (
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="text-sm px-3 py-2 rounded-md bg-heading text-background hover:opacity-90 disabled:opacity-50"
          >
            {connecting ? "Opening wallet..." : "Connect wallet"}
          </button>
        )}
      </div>

      {walletError && (
        <p className="mb-6 text-sm text-red-600" role="alert">
          {walletError}
        </p>
      )}

      {singleSuccess ? (
        <>
          <h1 className="text-3xl mb-2">Anchored</h1>
          <p className="text-foreground/70 mb-6">
            Your document is recorded on chain. Share the verification link or
            keep the certificate as a permanent proof of timestamp.
          </p>
          <div className="rounded-lg border border-foreground/10 bg-white p-5">
            <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
              Hash
            </div>
            <code className="font-mono text-xs break-all block mb-3">
              {singleSuccess.hash}
            </code>
            {singleSuccess.label && (
              <div className="mb-3">
                <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                  Label
                </div>
                <code className="font-mono text-xs">
                  {singleSuccess.label}
                </code>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/v/${singleSuccess.hash}?tx=${encodeURIComponent(singleSuccess.txId)}`}
                className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
              >
                Open verify page
              </Link>
              <button
                onClick={() =>
                  void downloadSingleCert(
                    singleSuccess.hash,
                    singleSuccess.label,
                    singleSuccess.owner,
                  )
                }
                disabled={certBusyHash === singleSuccess.hash}
                className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
              >
                {certBusyHash === singleSuccess.hash
                  ? "Preparing..."
                  : "Download certificate"}
              </button>
            </div>
            {certNoticeHash === singleSuccess.hash && (
              <p className="mt-3 text-xs text-amber-700">
                Not yet confirmed on chain. Try again in a moment, or open the
                verify page which polls automatically.
              </p>
            )}
          </div>
          <div className="mt-6 rounded-lg border border-foreground/10 bg-white p-5">
            <h2 className="text-lg mb-1">Proof NFT</h2>
            <p className="text-foreground/70 text-sm mb-4">
              Mint a soulbound NFT as permanent proof in your wallet (optional).
            </p>
            {mintTxId ? (
              <p className="text-sm text-green-700">
                Proof NFT minting submitted.{" "}
                <a
                  href={explorerTxUrl(mintTxId)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:no-underline"
                >
                  View transaction
                </a>
              </p>
            ) : (
              <button
                onClick={() =>
                  mintSingleProof(singleSuccess.hash, singleSuccess.label)
                }
                disabled={minting || !address}
                className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
              >
                {minting ? "Awaiting wallet signature..." : "Mint Proof NFT"}
              </button>
            )}
          </div>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link
              href="/anchors"
              className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
            >
              View my anchors
            </Link>
            <button
              onClick={startAnotherSingle}
              className="px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              Anchor another document
            </button>
          </div>
        </>
      ) : batchSuccess ? (
        <>
          <h1 className="text-3xl mb-2">Batch anchored</h1>
          <p className="text-foreground/70 mb-6">
            Each document below is recorded on chain. Share the verification
            links so anyone can confirm them without connecting a wallet.
          </p>
          <div className="space-y-3">
            {batchSuccess.entries.map((entry, idx) => (
              <div
                key={`${entry.hash}-${idx}`}
                className="rounded-lg border border-foreground/10 bg-white p-5"
              >
                <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                  Hash
                </div>
                <code className="font-mono text-xs break-all block mb-3">
                  {entry.hash}
                </code>
                {entry.label && (
                  <div className="mb-3">
                    <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                      Label
                    </div>
                    <code className="font-mono text-xs">{entry.label}</code>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/v/${entry.hash}?owner=${encodeURIComponent(batchSuccess.owner)}&tx=${encodeURIComponent(batchSuccess.txId)}`}
                    className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                  >
                    Open verify page
                  </Link>
                  <button
                    onClick={() =>
                      void copyVerifyLink(
                        entry.hash,
                        batchSuccess.owner,
                        batchSuccess.txId,
                      )
                    }
                    className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                  >
                    {copiedLinkHash === entry.hash
                      ? "Link copied"
                      : copyLinkFailedHash === entry.hash
                        ? "Copy failed"
                        : "Copy verify link"}
                  </button>
                  <button
                    onClick={() =>
                      void downloadBatchCert(
                        entry.hash,
                        entry.label,
                        batchSuccess.owner,
                        batchSuccess.txId,
                      )
                    }
                    disabled={certBusyHash === entry.hash}
                    className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
                  >
                    {certBusyHash === entry.hash
                      ? "Preparing..."
                      : "Download certificate"}
                  </button>
                </div>
                {certNoticeHash === entry.hash && (
                  <p className="mt-3 text-xs text-amber-700">
                    Not yet confirmed on chain. Try again in a moment, or open
                    the verify page which polls automatically.
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg border border-foreground/10 bg-white p-5">
            <h2 className="text-lg mb-1">Proof NFTs</h2>
            <p className="text-foreground/70 text-sm mb-4">
              Mint a soulbound NFT per document as permanent proof in your
              wallet (optional). Each one is a separate wallet signature.
            </p>
            {mintProgress ? (
              <p className="text-sm text-foreground/70">
                Minting {mintProgress.current} of {mintProgress.total}...
              </p>
            ) : mintTxId ? (
              <p className="text-sm text-green-700">
                Proof NFT minting submitted for {batchSuccess.entries.length}{" "}
                document{batchSuccess.entries.length === 1 ? "" : "s"}.
              </p>
            ) : (
              <button
                onClick={() => mintBatchProofs(batchSuccess.entries)}
                disabled={minting || !address}
                className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
              >
                {minting
                  ? "Awaiting wallet signature..."
                  : `Mint ${batchSuccess.entries.length} Proof NFT${batchSuccess.entries.length === 1 ? "" : "s"}`}
              </button>
            )}
          </div>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link
              href="/anchors"
              className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
            >
              View my anchors
            </Link>
            <button
              onClick={startAnotherBatch}
              className="px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              Anchor another batch
            </button>
          </div>
        </>
      ) : (
        <>
      <h1 className="text-3xl mb-2">Anchor a document</h1>
      <p className="text-foreground/70 mb-6">
        Files are hashed in your browser. Only the hash is submitted on chain.
      </p>

      <div
        role="group"
        aria-label="Anchor mode"
        className="inline-flex rounded-md border border-foreground/15 p-1 mb-8 bg-white"
      >
        <button
          onClick={() => setMode("single")}
          disabled={pending}
          aria-label="Anchor a single file"
          aria-pressed={mode === "single"}
          className={`text-sm px-4 py-2 rounded transition ${
            mode === "single"
              ? "bg-heading text-background"
              : "text-foreground/70 hover:text-foreground"
          } disabled:opacity-50`}
        >
          Single file
        </button>
        <button
          onClick={() => setMode("batch")}
          disabled={pending}
          aria-label={`Anchor a batch of up to ${MAX_BATCH} files`}
          aria-pressed={mode === "batch"}
          className={`text-sm px-4 py-2 rounded transition ${
            mode === "batch"
              ? "bg-heading text-background"
              : "text-foreground/70 hover:text-foreground"
          } disabled:opacity-50`}
        >
          Batch (up to {MAX_BATCH})
        </button>
      </div>

      {mode === "single" ? (
        <>
          <FileDropZone
            onFile={(f) => void onFileSelect(f)}
            disabled={pending}
            ariaLabel="Drop a file here to hash it, or click to choose one"
          >
            {file ? (
              <p className="text-foreground/80">
                <span className="font-medium">{file.name}</span>{" "}
                <span className="text-foreground/50 text-sm">
                  ({formatBytes(file.size)})
                </span>
              </p>
            ) : (
              <p className="text-foreground/60">
                Drop a file here, or click to choose one
              </p>
            )}
          </FileDropZone>

          {hashError && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {hashError}
            </p>
          )}

          {(hashing || hash) && (
            <div
              className="mt-6"
              role="region"
              aria-label="Document hash"
              aria-live="polite"
              aria-busy={hashing}
            >
              <div className="block text-sm text-foreground/60 mb-2">
                SHA-256
              </div>
              {hashing ? (
                <p className="font-mono text-sm text-foreground/50">
                  Hashing...
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs md:text-sm break-all bg-foreground/5 px-3 py-2 rounded flex-1">
                    {hash}
                  </code>
                  <button
                    onClick={copyHash}
                    aria-label="Copy document hash to clipboard"
                    className="text-xs px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition shrink-0"
                  >
                    {copied ? "Copied" : copyFailed ? "Copy failed" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <label
              htmlFor="label"
              className="block text-sm text-foreground/60 mb-2"
            >
              Label (optional, ASCII, up to 64 chars)
            </label>
            <input
              id="label"
              value={label}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="e.g. thesis-chapter-3-draft-v2"
              maxLength={64}
              aria-describedby="label-status"
              aria-invalid={labelError ? true : undefined}
              className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-white focus:outline-none focus:border-foreground/50"
            />
            <div
              id="label-status"
              className="mt-1 flex items-center justify-between text-xs"
            >
              <span
                className={labelError ? "text-red-600" : "text-transparent"}
                role={labelError ? "alert" : undefined}
              >
                {labelError ?? "."}
              </span>
              <span className="text-foreground/50 font-mono">
                {label.length}/64
              </span>
            </div>
          </div>

          <button
            onClick={submitSingle}
            disabled={!canSubmitSingle}
            className="mt-8 w-full px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            {pending
              ? registerProgress
                ? `Registering ${registerProgress.current} of ${registerProgress.total}...`
                : "Awaiting wallet signature..."
              : "Anchor on Stacks"}
          </button>
          <p className="mt-3 text-xs text-foreground/50 text-center">
            You will sign two transactions: the anchor itself, then a second to
            record it in your wallet&apos;s anchor history.
          </p>
        </>
      ) : (
        <>
          <div
            role="button"
            tabIndex={pending ? -1 : 0}
            aria-label={`Drop up to ${MAX_BATCH} files here to hash them, or click to choose`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                batchInput.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setBatchDragOver(true);
            }}
            onDragLeave={() => setBatchDragOver(false)}
            onDrop={onBatchDrop}
            onClick={() => batchInput.current?.click()}
            className={`rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
              batchDragOver
                ? "border-foreground/60 bg-foreground/5"
                : "border-foreground/20 hover:border-foreground/40"
            }`}
          >
            <input
              ref={batchInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addBatchFiles(e.target.files)}
            />
            <p className="text-foreground/60">
              Drop up to {MAX_BATCH} files here, or click to choose. Added:{" "}
              {rows.length}/{MAX_BATCH}.
            </p>
          </div>

          {batchLimitNotice && (
            <p className="mt-3 text-xs text-amber-700">{batchLimitNotice}</p>
          )}

          {rows.length > 0 && (
            <div className="mt-6 space-y-3">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-foreground/10 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {idx + 1}. {row.file.name}
                      </div>
                      <div className="text-xs text-foreground/50 mt-0.5">
                        {formatBytes(row.file.size)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={pending}
                      aria-label={`Remove file ${row.file.name}`}
                      className="text-xs px-2 py-1 rounded border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                      SHA-256
                    </div>
                    {row.hashing ? (
                      <p className="font-mono text-xs text-foreground/50">
                        Hashing...
                      </p>
                    ) : row.hashError ? (
                      <p className="text-xs text-red-600" role="alert">
                        {row.hashError}
                      </p>
                    ) : (
                      <code className="font-mono text-xs">
                        {row.hash ? truncateHashShort(row.hash) : "-"}
                      </code>
                    )}
                  </div>

                  <div className="mt-3">
                    <input
                      value={row.label}
                      onChange={(e) => updateRowLabel(row.id, e.target.value)}
                      placeholder="Label (optional, ASCII, up to 64 chars)"
                      maxLength={64}
                      disabled={pending}
                      aria-label={`Label for ${row.file.name}`}
                      aria-invalid={row.labelError ? true : undefined}
                      className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-white text-sm focus:outline-none focus:border-foreground/50 disabled:opacity-60"
                    />
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span
                        className={
                          row.labelError ? "text-red-600" : "text-transparent"
                        }
                      >
                        {row.labelError ?? "."}
                      </span>
                      <span className="text-foreground/50 font-mono">
                        {row.label.length}/64
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={submitBatch}
            disabled={!canSubmitBatch}
            className="mt-8 w-full px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            {pending
              ? registerProgress
                ? `Registering ${registerProgress.current} of ${registerProgress.total}...`
                : "Awaiting wallet signature..."
              : `Anchor batch of ${rows.length}`}
          </button>
          <p className="mt-3 text-xs text-foreground/50 text-center">
            You will sign one batch transaction, then one more per file to
            record each in your anchor history.
          </p>
        </>
      )}

      {pending && (
        <p className="mt-4 text-sm text-foreground/60 text-center">
          Do not navigate away while transactions are in your wallet.
        </p>
      )}

      {submitError && (
        <p className="mt-4 text-sm text-red-600 text-center" role="alert">
          {submitError}
        </p>
      )}
        </>
      )}
    </div>
  );
}
