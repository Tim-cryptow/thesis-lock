"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hashFile, submitAnchor } from "@/lib/stacks";
import { truncateAddress, useWallet } from "@/lib/wallet";

const ASCII_REGEX = /^[\x20-\x7E]*$/;

export default function AnchorPage() {
  const router = useRouter();
  const {
    address,
    connecting,
    error: walletError,
    connectWallet,
    disconnectWallet,
  } = useWallet();
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

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

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0] ?? null;
      void onFileSelect(f);
    },
    [onFileSelect],
  );

  const onLabelChange = (next: string) => {
    if (!ASCII_REGEX.test(next)) {
      setLabelError("Labels must be ASCII only.");
      return;
    }
    if (next.length > 64) {
      setLabel(next.slice(0, 64));
      setLabelError(null);
      return;
    }
    setLabel(next);
    setLabelError(null);
  };

  const copyHash = async () => {
    if (!hash) return;
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const canSubmit = !!hash && !labelError && !!address && !pending;

  const onSubmit = () => {
    if (!hash || !address) return;
    setPending(true);
    submitAnchor(
      hash,
      label,
      () => {
        router.push(`/v/${hash}`);
      },
      () => setPending(false),
    );
  };

  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-10">
        <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
          &larr; ThesisLock
        </Link>
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

      {walletError && (
        <p className="mb-6 text-sm text-red-600" role="alert">
          {walletError}
        </p>
      )}

      <h1 className="text-3xl mb-2">Anchor a document</h1>
      <p className="text-foreground/70 mb-8">
        The file is hashed in your browser. Only the hash is submitted on chain.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
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
          onChange={(e) => void onFileSelect(e.target.files?.[0] ?? null)}
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

      {hashError && (
        <p className="mt-6 text-sm text-red-600" role="alert">
          {hashError}
        </p>
      )}

      {(hashing || hash) && !hashError && (
        <div className="mt-6">
          <label className="block text-sm text-foreground/60 mb-2">
            SHA-256
          </label>
          {hashing ? (
            <p className="font-mono text-sm text-foreground/50">Hashing...</p>
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
        <label htmlFor="label" className="block text-sm text-foreground/60 mb-2">
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
        onClick={onSubmit}
        disabled={!canSubmit}
        className="mt-8 w-full px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        {pending ? "Awaiting wallet signature..." : "Anchor on Stacks"}
      </button>

      {pending && (
        <p className="mt-4 text-sm text-foreground/60 text-center">
          Do not navigate away while the transaction is in your wallet.
        </p>
      )}
    </main>
  );
}
