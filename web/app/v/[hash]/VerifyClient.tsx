"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { hashFile, readAnchor, type Anchor } from "@/lib/stacks";

const HEX_64 = /^[0-9a-f]{64}$/;

export default function VerifyPage() {
  const params = useParams<{ hash: string }>();
  const hash = params.hash;
  const [valid] = useState(() => HEX_64.test(hash));
  const [loading, setLoading] = useState(true);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyHash, setVerifyHash] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [shareUrl, setShareUrl] = useState("");
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 1500);
  };

  const tweetIntent = (() => {
    if (!shareUrl) return "";
    const text = "Anchored on Stacks. Verifiable timestamp without sharing the file:";
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text,
    )}&url=${encodeURIComponent(shareUrl)}`;
  })();

  useEffect(() => {
    if (!valid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await readAnchor(hash);
        if (!cancelled) setAnchor(result);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Read failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash, valid]);

  const onVerifyFile = async (file: File | null) => {
    if (!file) return;
    setVerifyFile(file);
    setVerifyHash(null);
    setVerifying(true);
    try {
      const h = await hashFile(file);
      setVerifyHash(h);
    } finally {
      setVerifying(false);
    }
  };

  const explorerAddress = (principal: string) =>
    `https://explorer.hiro.so/address/${principal}?chain=mainnet`;

  if (!valid) {
    return (
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
          &larr; ThesisLock
        </Link>
        <h1 className="text-3xl mt-8 mb-2">Invalid hash format.</h1>
        <p className="text-foreground/70">
          A valid hash is 64 lowercase hex characters.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
        &larr; ThesisLock
      </Link>
      <h1 className="text-3xl mt-8 mb-6">Anchor record</h1>

      <div className="rounded-lg border border-foreground/10 bg-white p-6">
        <div className="mb-4">
          <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
            Hash (SHA-256)
          </div>
          <code className="font-mono text-xs md:text-sm break-all">{hash}</code>
        </div>

        {loading ? (
          <p className="text-foreground/60">Looking up on chain...</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : !anchor ? (
          <div className="mt-4 pt-4 border-t border-foreground/10">
            <p className="text-foreground/80">
              This hash has not been anchored.
            </p>
            <Link
              href="/anchor"
              className="inline-block mt-3 text-sm underline hover:no-underline"
            >
              Anchor a document
            </Link>
          </div>
        ) : (
          <div className="mt-4 pt-4 border-t border-foreground/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                Anchored by
              </div>
              <a
                href={explorerAddress(anchor.anchoredBy)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs md:text-sm break-all underline hover:no-underline"
              >
                {anchor.anchoredBy}
              </a>
            </div>
            <div>
              <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                Label
              </div>
              <code className="font-mono text-xs md:text-sm">
                {anchor.label || "(none)"}
              </code>
            </div>
            <div>
              <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                Stacks block
              </div>
              <code className="font-mono text-sm">{anchor.stacksBlock}</code>
            </div>
            <div>
              <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                Burn block
              </div>
              <code className="font-mono text-sm">{anchor.burnBlock}</code>
            </div>
          </div>
        )}
      </div>

      {anchor && (
        <div className="mt-6 rounded-lg border border-foreground/10 bg-white p-6">
          <h2 className="text-xl mb-2">Share this verification</h2>
          <p className="text-foreground/70 text-sm mb-4">
            Anyone with this link can confirm the timestamp without you ever
            sending the file.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyShareUrl}
              disabled={!shareUrl}
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
            >
              {copiedShare ? "Link copied" : "Copy verification link"}
            </button>
            <a
              href={tweetIntent || "#"}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!shareUrl}
              className="text-sm px-3 py-2 rounded-md bg-heading text-background hover:opacity-90 transition"
            >
              Share on X
            </a>
          </div>
        </div>
      )}

      <div className="mt-10 rounded-lg border border-foreground/10 bg-white p-6">
        <h2 className="text-xl mb-2">Verify a file</h2>
        <p className="text-foreground/70 text-sm mb-4">
          Pick a file. The browser will hash it and compare to the anchored hash.
        </p>
        <input
          type="file"
          onChange={(e) => void onVerifyFile(e.target.files?.[0] ?? null)}
          className="block text-sm"
        />
        {verifyFile && (
          <div className="mt-4 text-sm">
            <div className="font-medium mb-1">{verifyFile.name}</div>
            {verifying ? (
              <p className="text-foreground/60">Hashing...</p>
            ) : verifyHash ? (
              verifyHash === hash ? (
                <p className="text-green-700">
                  Match. This file is the anchored document.
                </p>
              ) : (
                <p className="text-red-600">
                  No match. This is a different file.
                </p>
              )
            ) : null}
            {verifyHash && (
              <code className="block font-mono text-xs break-all text-foreground/60 mt-2">
                {verifyHash}
              </code>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
