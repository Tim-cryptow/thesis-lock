"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BATCH_CONTRACT_FULL_NAME,
  SINGLE_CONTRACT_NAME,
  getAnchorCount,
  getRecentAnchors,
  readAnchor,
  readBatchAnchor,
  type RegistryEntry,
} from "@/lib/stacks";
import { truncateAddress, useWallet } from "@/lib/wallet";
import { downloadCertificate } from "@/lib/downloadCertificate";

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export default function AnchorsPage() {
  const { address, connecting, connectWallet, disconnectWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadHistory = useCallback(async (owner: string) => {
    setLoading(true);
    setError(null);
    try {
      const [c, recent] = await Promise.all([
        getAnchorCount(owner),
        getRecentAnchors(owner),
      ]);
      setCount(c);
      setEntries(recent.filter((e): e is RegistryEntry => e !== null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!address) {
      setCount(null);
      setEntries([]);
      return;
    }
    void loadHistory(address);
  }, [address, loadHistory]);

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const [certBusyHash, setCertBusyHash] = useState<string | null>(null);
  const [certErrorHash, setCertErrorHash] = useState<string | null>(null);

  const downloadEntryCertificate = async (entry: RegistryEntry) => {
    if (!address) return;
    setCertErrorHash(null);
    setCertBusyHash(entry.hash);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      // Check the wallet's batch entry first. thesislock-batch is keyed by
      // {hash, owner}, while thesislock is global (one anchor per hash,
      // anyone can claim). For a registry entry that belongs to this wallet
      // via a batch anchor, the global single record may name a different
      // anchorer for the same hash — falling through to it would generate a
      // certificate for the wrong record.
      const batch = await readBatchAnchor(entry.hash, address);
      if (batch) {
        downloadCertificate({
          hash: entry.hash,
          label: batch.label || entry.label,
          owner: address,
          stacksBlock: batch.stacksBlock,
          burnBlock: batch.burnBlock,
          timestamp: new Date().toISOString(),
          contractName: BATCH_CONTRACT_FULL_NAME,
          verifyUrl: `${origin}/v/${entry.hash}?owner=${encodeURIComponent(address)}`,
        });
        return;
      }
      const single = await readAnchor(entry.hash);
      if (single) {
        downloadCertificate({
          hash: entry.hash,
          label: single.label || entry.label,
          owner: single.anchoredBy,
          stacksBlock: single.stacksBlock,
          burnBlock: single.burnBlock,
          timestamp: new Date().toISOString(),
          contractName: SINGLE_CONTRACT_NAME,
          verifyUrl: `${origin}/v/${entry.hash}`,
        });
        return;
      }
      setCertErrorHash(entry.hash);
      setTimeout(() => setCertErrorHash(null), 4000);
    } catch {
      setCertErrorHash(entry.hash);
      setTimeout(() => setCertErrorHash(null), 4000);
    } finally {
      setCertBusyHash(null);
    }
  };

  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
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
          <span className="text-foreground font-medium">My Anchors</span>
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

      <h1 className="text-3xl mb-2">My Anchors</h1>
      <p className="text-foreground/70 mb-8">
        Documents you have anchored, newest first. Up to the 10 most recent
        registered to this wallet.
      </p>

      {!address ? (
        <div className="rounded-lg border border-foreground/10 bg-white p-10 text-center">
          <p className="text-foreground/70 mb-6">
            Connect your Stacks wallet to view your anchor history.
          </p>
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-50"
          >
            {connecting ? "Opening wallet..." : "Connect wallet"}
          </button>
        </div>
      ) : loading ? (
        <p className="text-foreground/60">Loading history...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : count === 0 ? (
        <div className="rounded-lg border border-foreground/10 bg-white p-10 text-center">
          <p className="text-foreground/70 mb-6">No anchors yet.</p>
          <Link
            href="/anchor"
            className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
          >
            Anchor a document
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => (
            <div
              key={`${entry.hash}-${idx}`}
              className="rounded-lg border border-foreground/10 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                    Hash
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm">
                      {truncateHash(entry.hash)}
                    </code>
                    <button
                      onClick={() => void copyHash(entry.hash)}
                      className="text-xs px-2 py-1 rounded border border-foreground/15 hover:border-foreground/40 transition"
                    >
                      {copiedHash === entry.hash ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => void downloadEntryCertificate(entry)}
                    disabled={certBusyHash === entry.hash}
                    className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
                    title="Download certificate"
                  >
                    {certBusyHash === entry.hash ? "Preparing..." : "Download"}
                  </button>
                  <Link
                    href={`/v/${entry.hash}?owner=${encodeURIComponent(address)}`}
                    className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                  >
                    Verify &rarr;
                  </Link>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                    Label
                  </div>
                  <code className="font-mono text-xs">
                    {entry.label || "(none)"}
                  </code>
                </div>
                <div>
                  <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                    Stacks block
                  </div>
                  <code className="font-mono text-xs">{entry.anchoredAt}</code>
                </div>
              </div>
              {certErrorHash === entry.hash && (
                <p className="mt-3 text-xs text-amber-700">
                  Could not load on-chain anchor data. Try again in a moment.
                </p>
              )}
            </div>
          ))}
          {count !== null && count > entries.length && (
            <p className="text-xs text-foreground/50 text-center pt-2">
              Showing the 10 most recent of {count} anchors.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
