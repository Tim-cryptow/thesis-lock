"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  hashFile,
  registerAnchor,
  submitAnchor,
  submitBatchAnchor,
} from "@/lib/stacks";
import { truncateAddress, useWallet } from "@/lib/wallet";

const ASCII_REGEX = /^[\x20-\x7E]*$/;
const MAX_BATCH = 10;

type Mode = "single" | "batch";

type BatchRow = {
  id: string;
  file: File;
  hash: string | null;
  hashing: boolean;
  label: string;
  labelError: string | null;
};

type RegisterProgress = { current: number; total: number };

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
  const router = useRouter();
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();

  const [mode, setMode] = useState<Mode>("single");

  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [rows, setRows] = useState<BatchRow[]>([]);
  const [batchDragOver, setBatchDragOver] = useState(false);
  const [batchLimitNotice, setBatchLimitNotice] = useState<string | null>(null);
  const batchInput = useRef<HTMLInputElement | null>(null);

  const [pending, setPending] = useState(false);
  const [registerProgress, setRegisterProgress] =
    useState<RegisterProgress | null>(null);

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
    setHashing(true);
    try {
      const h = await hashFile(selected);
      setHash(h);
    } finally {
      setHashing(false);
    }
  }, []);

  const onSingleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0] ?? null;
      void onFileSelect(f);
    },
    [onFileSelect],
  );

  const onLabelChange = (next: string) => {
    const { value, error } = validateLabel(next);
    setLabel(value);
    setLabelError(error);
  };

  const copyHash = async () => {
    if (!hash) return;
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
        label: "",
        labelError: null,
      }));
      newRows.forEach((row) => {
        void hashFile(row.file).then((h) => {
          setRows((current) =>
            current.map((r) =>
              r.id === row.id ? { ...r, hash: h, hashing: false } : r,
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
    setPending(true);
    submitAnchor(
      hash,
      label,
      () => {
        registerSequentially(
          [{ hash, label }],
          0,
          () => {
            setPending(false);
            router.push(`/v/${hash}`);
          },
          () => {
            setPending(false);
            router.push(`/v/${hash}`);
          },
        );
      },
      () => setPending(false),
    );
  };

  const allRowsReady =
    rows.length > 0 &&
    rows.every((r) => r.hash && !r.hashing && !r.labelError);
  const canSubmitBatch = allRowsReady && !!address && !pending;

  const submitBatch = () => {
    if (!canSubmitBatch || !address) return;
    const entries = rows.map((r) => ({ hash: r.hash!, label: r.label }));
    setPending(true);
    submitBatchAnchor(
      entries,
      () => {
        registerSequentially(
          entries,
          0,
          () => {
            setPending(false);
            router.push("/anchors");
          },
          () => {
            setPending(false);
            router.push("/anchors");
          },
        );
      },
      () => setPending(false),
    );
  };

  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
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
        </div>
        {address ? (
          <button
            onClick={disconnectWallet}
            className="text-sm font-mono px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            title="Disconnect"
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

      <h1 className="text-3xl mb-2">Anchor a document</h1>
      <p className="text-foreground/70 mb-6">
        Files are hashed in your browser. Only the hash is submitted on chain.
      </p>

      <div className="inline-flex rounded-md border border-foreground/15 p-1 mb-8 bg-white">
        <button
          onClick={() => setMode("single")}
          disabled={pending}
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
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onSingleDrop}
            onClick={() => fileInput.current?.click()}
            className={`rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition ${
              dragOver
                ? "border-foreground/60 bg-foreground/5"
                : "border-foreground/20 hover:border-foreground/40"
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              onChange={(e) =>
                void onFileSelect(e.target.files?.[0] ?? null)
              }
            />
            {file ? (
              <p className="text-foreground/80">
                <span className="font-medium">{file.name}</span>{" "}
                <span className="text-foreground/50 text-sm">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </p>
            ) : (
              <p className="text-foreground/60">
                Drop a file here, or click to choose one
              </p>
            )}
          </div>

          {(hashing || hash) && (
            <div className="mt-6">
              <label className="block text-sm text-foreground/60 mb-2">
                SHA-256
              </label>
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
                    className="text-xs px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition shrink-0"
                  >
                    {copied ? "Copied" : "Copy"}
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
              className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-white focus:outline-none focus:border-foreground/50"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className={labelError ? "text-red-600" : "text-transparent"}>
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
            onDragOver={(e) => {
              e.preventDefault();
              setBatchDragOver(true);
            }}
            onDragLeave={() => setBatchDragOver(false)}
            onDrop={onBatchDrop}
            onClick={() => batchInput.current?.click()}
            className={`rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition ${
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
                        {(row.file.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={pending}
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
    </main>
  );
}
