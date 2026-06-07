"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  getProofByHash,
  hashFile,
  readAnchor,
  readBatchAnchor,
} from "@/lib/stacks";
import { truncateAddress, useWallet } from "@/lib/wallet";

type Source = "single" | "batch" | "proof";

type RowStatus = "checking" | "verified" | "notfound" | "error";

type Row = {
  id: string;
  file: File;
  hash: string | null;
  status: RowStatus;
  source: Source | null;
  block: number | null;
  message: string | null;
};

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function newId(file: File): string {
  return `${file.name}-${file.size}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export default function BulkVerifyClient() {
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();
  const [rows, setRows] = useState<Row[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Resolve one already-hashed file against the contracts. Single anchors are
  // global and public, so they come first. The batch contract is keyed by
  // {hash, owner}, so it can only be checked when a wallet is connected.
  // Proof NFTs are global and looked up by hash regardless of wallet.
  const resolve = useCallback(
    async (id: string, hash: string, owner: string | null) => {
      try {
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
                  }
                : r,
            ),
          );
          return;
        }

        setRows((cur) =>
          cur.map((r) =>
            r.id === id ? { ...r, status: "notfound" } : r,
          ),
        );
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Could not check this hash.";
        setRows((cur) =>
          cur.map((r) =>
            r.id === id ? { ...r, status: "error", message } : r,
          ),
        );
      }
    },
    [],
  );

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming) return;
      const files = Array.from(incoming);
      if (files.length === 0) return;
      const owner = address;
      const newRows: Row[] = files.map((file) => ({
        id: newId(file),
        file,
        hash: null,
        status: "checking",
        source: null,
        block: null,
        message: null,
      }));
      setRows((prev) => [...prev, ...newRows]);
      newRows.forEach((row) => {
        hashFile(row.file)
          .then((hash) => {
            setRows((cur) =>
              cur.map((r) => (r.id === row.id ? { ...r, hash } : r)),
            );
            void resolve(row.id, hash, owner);
          })
          .catch((e: unknown) => {
            const message =
              e instanceof Error ? e.message : "Could not hash this file.";
            setRows((cur) =>
              cur.map((r) =>
                r.id === row.id ? { ...r, status: "error", message } : r,
              ),
            );
          });
      });
    },
    [address, resolve],
  );

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

  const clearAll = () => setRows([]);

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            &larr; ThesisLock
          </Link>
          <Link
            href="/anchor"
            className="text-foreground/60 hover:text-foreground"
          >
            Anchor
          </Link>
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
          <span className="text-foreground font-medium">Bulk Verify</span>
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

      <h1 className="text-3xl mb-2">Bulk verify</h1>
      <p className="text-foreground/70 mb-8">
        Drop multiple documents to check them all against the chain at once.
        Files are hashed in your browser and never uploaded. Connect your wallet
        to also resolve batch anchors keyed to your principal.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop files here to verify them, or click to choose"
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
          Drop files here, or click to choose. Add as many as you like.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <h2 className="text-lg">Results</h2>
            <button
              onClick={clearAll}
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              Clear all
            </button>
          </div>

          <div className="space-y-3" role="list">
            {rows.map((row) => (
              <div
                key={row.id}
                role="listitem"
                className="rounded-lg border border-foreground/10 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {row.file.name}
                    </div>
                    {row.hash ? (
                      <div className="mt-1 flex items-center gap-2">
                        <code className="font-mono text-xs">
                          {truncateHash(row.hash)}
                        </code>
                        <button
                          onClick={() => void copyHash(row.hash!)}
                          aria-label="Copy hash"
                          className="text-xs px-2 py-0.5 rounded border border-foreground/15 hover:border-foreground/40 transition"
                        >
                          {copiedHash === row.hash ? "Copied" : "Copy"}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-foreground/50 font-mono">
                        Hashing...
                      </div>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    {row.status === "checking" ? (
                      <span className="text-foreground/50">Checking...</span>
                    ) : row.status === "verified" ? (
                      <span className="text-green-700">Verified &#10003;</span>
                    ) : row.status === "notfound" ? (
                      <span className="text-red-600">Not found &#10007;</span>
                    ) : (
                      <span className="text-amber-700">Error</span>
                    )}
                  </div>
                </div>

                {row.status === "error" && row.message && (
                  <p className="mt-2 text-xs text-amber-700">{row.message}</p>
                )}

                {(row.source || row.block !== null || row.hash) && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        Source
                      </div>
                      <code className="font-mono text-xs">
                        {row.source ?? "-"}
                      </code>
                    </div>
                    <div>
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        Stacks block
                      </div>
                      <code className="font-mono text-xs">
                        {row.block !== null ? row.block : "-"}
                      </code>
                    </div>
                    <div className="sm:text-right">
                      {row.status === "verified" && row.hash && (
                        <Link
                          href={
                            row.source === "batch" && address
                              ? `/v/${row.hash}?owner=${encodeURIComponent(address)}`
                              : `/v/${row.hash}`
                          }
                          aria-label={`Open verify page for ${row.file.name}`}
                          className="inline-flex text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                        >
                          Verify &rarr;
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
