"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BATCH_CONTRACT_FULL_NAME,
  SINGLE_CONTRACT_NAME,
  explorerAddressUrl,
  explorerTxUrl,
  getProofByHash,
  hashFile,
  readAnchor,
  readBatchAnchor,
  type Anchor,
  type BatchAnchor,
  type ProofWithId,
} from "@/lib/stacks";
import { useWallet } from "@/lib/wallet";
import { downloadCertificate } from "@/lib/downloadCertificate";
import FileDropZone from "@/app/components/FileDropZone";

const HEX_64 = /^[0-9a-f]{64}$/;
// c32-encoded Stacks principals are variable length: hash160 leading zero
// bytes are stripped during encoding, so addresses like the burn principal
// SP000000000000000000002Q6VF78 are well under the typical 41 chars.
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

export default function VerifyPage() {
  const params = useParams<{ hash: string }>();
  const searchParams = useSearchParams();
  const hash = (params.hash ?? "").toLowerCase();
  const valid = useMemo(() => HEX_64.test(hash), [hash]);
  const { address } = useWallet();

  const rawOwnerParam = searchParams.get("owner");
  const ownerParam = useMemo(() => {
    if (!rawOwnerParam) return null;
    const upper = rawOwnerParam.toUpperCase();
    return STX_PRINCIPAL.test(upper) ? upper : null;
  }, [rawOwnerParam]);
  const batchOwner = ownerParam ?? address ?? null;

  const [loading, setLoading] = useState(true);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [batchAnchor, setBatchAnchor] = useState<BatchAnchor | null>(null);
  const [proof, setProof] = useState<ProofWithId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyHash, setVerifyHash] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [shareUrl, setShareUrl] = useState("");
  const [copiedShare, setCopiedShare] = useState(false);
  const [copyShareFailed, setCopyShareFailed] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  useEffect(() => {
    setShareUrl(window.location.href);
    setTxId(new URLSearchParams(window.location.search).get("tx"));
  }, []);

  // When ?owner= is explicit in the URL, the page is asking about a {hash,
  // owner}-keyed batch record. Prefer it over a global single anchor with
  // the same hash, which could be an unrelated entry by a different
  // anchorer. Otherwise fall back to the historical "single first, batch as
  // fallback" ordering.
  const preferBatch = Boolean(
    batchAnchor && batchOwner && (ownerParam || !anchor),
  );

  // When the batch path resolves via the connected wallet rather than the
  // URL's ?owner=, the bare share URL points recipients to a page that
  // can't look it up without their own wallet connected. Inject the owner
  // so the share/cert link works publicly.
  const publicVerifyUrl = useMemo(() => {
    if (!shareUrl) return "";
    if (preferBatch && batchOwner && !ownerParam) {
      try {
        const u = new URL(shareUrl);
        u.searchParams.set("owner", batchOwner);
        return u.toString();
      } catch {
        return shareUrl;
      }
    }
    return shareUrl;
  }, [shareUrl, preferBatch, batchOwner, ownerParam]);

  const copyShareUrl = async () => {
    if (!publicVerifyUrl) return;
    try {
      await navigator.clipboard.writeText(publicVerifyUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 1500);
    } catch {
      setCopyShareFailed(true);
      setTimeout(() => setCopyShareFailed(false), 1500);
    }
  };

  const tweetIntent = (() => {
    if (!publicVerifyUrl) return "";
    const text = "Anchored on Stacks. Verifiable timestamp without sharing the file:";
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text,
    )}&url=${encodeURIComponent(publicVerifyUrl)}`;
  })();

  const loadAnchor = useCallback(
    async (showLoading = true) => {
      if (!valid) {
        setLoading(false);
        return;
      }
      if (showLoading) setLoading(true);
      setError(null);
      try {
        const result = await readAnchor(hash);
        setAnchor(result);
        // Also fetch the batch record when ?owner= is explicit in the URL:
        // the global single contract and the {hash, owner}-keyed batch
        // contract can carry unrelated records for the same hash, and an
        // explicit owner param means the URL is specifically asking about
        // the batch record.
        if (batchOwner && (!result || ownerParam)) {
          try {
            const b = await readBatchAnchor(hash, batchOwner);
            setBatchAnchor(b);
          } catch {
            setBatchAnchor(null);
          }
        } else {
          setBatchAnchor(null);
        }
      } catch (e) {
        console.error(e);
        setError(
          "Could not look up this anchor. Check your connection and try again.",
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [hash, valid, batchOwner, ownerParam],
  );

  useEffect(() => {
    void loadAnchor();
  }, [loadAnchor]);

  // A proof NFT is optional and keyed only by hash, so look it up
  // independently. A miss or read error just means no NFT to show.
  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    getProofByHash(hash)
      .then((p) => {
        if (!cancelled) setProof(p);
      })
      .catch(() => {
        if (!cancelled) setProof(null);
      });
    return () => {
      cancelled = true;
    };
  }, [hash, valid]);

  // While a freshly submitted transaction is unconfirmed, poll until the
  // anchor appears on chain, then stop.
  useEffect(() => {
    if (!valid || !txId || anchor || batchAnchor || error) return;
    const id = setInterval(() => void loadAnchor(false), 15000);
    return () => clearInterval(id);
  }, [valid, txId, anchor, batchAnchor, error, loadAnchor]);

  const onVerifyFile = async (file: File | null) => {
    if (!file) return;
    setVerifyFile(file);
    setVerifyHash(null);
    setVerifyError(null);
    setVerifying(true);
    try {
      const h = await hashFile(file);
      setVerifyHash(h);
    } catch (e) {
      setVerifyError(
        e instanceof Error ? e.message : "Could not hash this file.",
      );
    } finally {
      setVerifying(false);
    }
  };

  if (!valid) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <div className="flex items-center gap-4 text-sm flex-wrap">
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
            href="/groups"
            className="text-foreground/60 hover:text-foreground"
          >
            Groups
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
        <h1 className="text-3xl mt-8 mb-2">Invalid hash format.</h1>
        <p className="text-foreground/70">
          A valid hash is 64 lowercase hex characters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm flex-wrap">
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
          href="/groups"
          className="text-foreground/60 hover:text-foreground"
        >
          Groups
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
      </div>
      <h1 className="text-3xl mt-8 mb-6">Anchor record</h1>

      <div className="rounded-lg border border-foreground/10 bg-white p-6">
        <div className="mb-4">
          <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
            Hash (SHA-256)
          </div>
          <code className="font-mono text-xs md:text-sm break-all">{hash}</code>
        </div>

        <div role="status" aria-live="polite" aria-busy={loading || undefined}>
        {loading ? (
          <p className="text-foreground/60">Looking up on chain...</p>
        ) : error ? (
          <div className="mt-4 pt-4 border-t border-foreground/10">
            <p className="text-red-600" role="alert">
              {error}
            </p>
            <button
              onClick={() => void loadAnchor()}
              className="mt-3 text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              Try again
            </button>
          </div>
        ) : preferBatch && batchAnchor && batchOwner ? (
          <div className="mt-4 pt-4 border-t border-foreground/10">
            <p className="text-foreground/80 text-sm mb-3">
              Anchored via batch transaction
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  Owner
                </div>
                <a
                  href={explorerAddressUrl(batchOwner)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs md:text-sm break-all underline hover:no-underline"
                >
                  {batchOwner}
                </a>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  Label
                </div>
                <code className="font-mono text-xs md:text-sm">
                  {batchAnchor.label || "(none)"}
                </code>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  Stacks block
                </div>
                <code className="font-mono text-sm">
                  {batchAnchor.stacksBlock}
                </code>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  Burn block
                </div>
                <code className="font-mono text-sm">
                  {batchAnchor.burnBlock}
                </code>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  Batch ID
                </div>
                <code className="font-mono text-sm">
                  #{batchAnchor.batchId}
                </code>
              </div>
            </div>
          </div>
        ) : !anchor ? (
          txId ? (
            <div className="mt-4 pt-4 border-t border-foreground/10">
              <p className="text-foreground/80">
                Transaction submitted. Waiting for it to be confirmed on
                chain. This can take a few minutes and updates automatically.
              </p>
              <a
                href={explorerTxUrl(txId)}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-3 text-sm underline hover:no-underline"
              >
                View transaction in the explorer
              </a>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-foreground/10">
              <p className="text-foreground/80">
                This hash has not been anchored.
              </p>
              {!batchOwner && (
                <p className="mt-3 text-sm text-foreground/70">
                  If this was batch-anchored, add{" "}
                  <code className="font-mono">?owner=&lt;principal&gt;</code>{" "}
                  to the URL or connect the anchoring wallet to verify.
                </p>
              )}
              <Link
                href="/anchor"
                className="inline-block mt-3 text-sm underline hover:no-underline"
              >
                Anchor a document
              </Link>
            </div>
          )
        ) : (
          <div className="mt-4 pt-4 border-t border-foreground/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                Anchored by
              </div>
              <a
                href={explorerAddressUrl(anchor.anchoredBy)}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs md:text-sm break-all underline hover:no-underline"
              >
                {anchor.anchoredBy}
              </a>
            </div>
            <div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                Label
              </div>
              <code className="font-mono text-xs md:text-sm">
                {anchor.label || "(none)"}
              </code>
            </div>
            <div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                Stacks block
              </div>
              <code className="font-mono text-sm">{anchor.stacksBlock}</code>
            </div>
            <div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                Burn block
              </div>
              <code className="font-mono text-sm">{anchor.burnBlock}</code>
            </div>
          </div>
        )}
        </div>
      </div>

      {proof && (
        <div className="mt-6 rounded-lg border border-foreground/10 bg-white p-6">
          <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
            Proof NFT
          </div>
          <p className="text-sm text-foreground/80">
            Proof NFT #{proof.tokenId} minted by{" "}
            <a
              href={explorerAddressUrl(proof.anchoredBy)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs md:text-sm break-all underline hover:no-underline"
            >
              {proof.anchoredBy}
            </a>
          </p>
        </div>
      )}

      {(anchor || (batchAnchor && batchOwner)) && (
        <div className="mt-6 rounded-lg border border-foreground/10 bg-white p-6">
          <h2 className="text-xl mb-2">Share this verification</h2>
          <p className="text-foreground/70 text-sm mb-4">
            Anyone with this link can confirm the timestamp without you ever
            sending the file.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyShareUrl}
              disabled={!publicVerifyUrl}
              aria-label="Copy verification link to clipboard"
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
            >
              {copiedShare
                ? "Link copied"
                : copyShareFailed
                  ? "Copy failed"
                  : "Copy verification link"}
            </button>
            <button
              onClick={() => {
                const verifyUrl = publicVerifyUrl || window.location.href;
                if (preferBatch && batchAnchor && batchOwner) {
                  downloadCertificate({
                    hash,
                    label: batchAnchor.label,
                    owner: batchOwner,
                    stacksBlock: batchAnchor.stacksBlock,
                    burnBlock: batchAnchor.burnBlock,
                    timestamp: new Date().toISOString(),
                    contractName: BATCH_CONTRACT_FULL_NAME,
                    verifyUrl,
                  });
                } else if (anchor) {
                  downloadCertificate({
                    hash,
                    label: anchor.label,
                    owner: anchor.anchoredBy,
                    stacksBlock: anchor.stacksBlock,
                    burnBlock: anchor.burnBlock,
                    timestamp: new Date().toISOString(),
                    contractName: SINGLE_CONTRACT_NAME,
                    verifyUrl,
                  });
                } else if (batchAnchor && batchOwner) {
                  downloadCertificate({
                    hash,
                    label: batchAnchor.label,
                    owner: batchOwner,
                    stacksBlock: batchAnchor.stacksBlock,
                    burnBlock: batchAnchor.burnBlock,
                    timestamp: new Date().toISOString(),
                    contractName: BATCH_CONTRACT_FULL_NAME,
                    verifyUrl,
                  });
                }
              }}
              aria-label="Download verification certificate"
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              Download certificate
            </button>
            {publicVerifyUrl ? (
              <a
                href={tweetIntent}
                target="_blank"
                rel="noreferrer"
                className="text-sm px-3 py-2 rounded-md bg-heading text-background hover:opacity-90 transition"
              >
                Share on X
              </a>
            ) : (
              <button
                disabled
                className="text-sm px-3 py-2 rounded-md bg-heading text-background opacity-50 cursor-not-allowed"
              >
                Share on X
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-10 rounded-lg border border-foreground/10 bg-white p-6">
        <h2 className="text-xl mb-2">Verify a file</h2>
        <p className="text-foreground/70 text-sm mb-4">
          Pick a file. The browser will hash it and compare to the anchored hash.
        </p>
        <FileDropZone
          onFile={(f) => void onVerifyFile(f)}
          ariaLabel="Choose a file to verify against this hash, or drop one here"
        >
          {verifyFile ? (
            <p className="text-foreground/80 font-medium">{verifyFile.name}</p>
          ) : (
            <p className="text-foreground/60">
              Drop a file here, or click to choose one
            </p>
          )}
        </FileDropZone>
        {verifyFile && (
          <div className="mt-4 text-sm">
            {verifyError ? (
              <p className="text-red-600" role="alert">
                {verifyError}
              </p>
            ) : verifying ? (
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
    </div>
  );
}
