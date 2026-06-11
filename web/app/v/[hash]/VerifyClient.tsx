"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
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
import {
  findGroupAnchorByHash,
  getGroupAnchorByLocation,
  type GroupAnchorMatch,
} from "@/lib/groups";
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

  // A group link from search carries the exact on-chain location
  // { group-id, index } of the anchor it represents, so the verify page can
  // resolve that precise row rather than the newest group anchor for the hash.
  const rawGroupParam = searchParams.get("group");
  const rawGroupIndexParam = searchParams.get("gi");
  const groupLocation = useMemo(() => {
    if (rawGroupParam === null || rawGroupIndexParam === null) return null;
    const groupId = Number(rawGroupParam);
    const index = Number(rawGroupIndexParam);
    if (!Number.isInteger(groupId) || groupId < 0) return null;
    if (!Number.isInteger(index) || index < 0) return null;
    return { groupId, index };
  }, [rawGroupParam, rawGroupIndexParam]);

  const [loading, setLoading] = useState(true);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [batchAnchor, setBatchAnchor] = useState<BatchAnchor | null>(null);
  const [groupAnchor, setGroupAnchor] = useState<GroupAnchorMatch | null>(null);
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

  // An explicit group link asks about one specific group anchor, so show it
  // even when the same hash also has a single or batch anchor by someone else.
  const preferGroup = Boolean(groupLocation && groupAnchor);

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
        let batch: BatchAnchor | null = null;
        if (batchOwner && (!result || ownerParam)) {
          try {
            batch = await readBatchAnchor(hash, batchOwner);
          } catch {
            batch = null;
          }
        }
        setBatchAnchor(batch);
        // When the link carries an explicit group location, resolve that exact
        // { group-id, index } anchor so re-anchored or multi-group hashes show
        // the row that was clicked. Confirm its hash matches the URL before
        // trusting it, so tampered or stale params fall through to the
        // hash-based lookup instead of displaying an unrelated anchor.
        if (groupLocation) {
          const located = await getGroupAnchorByLocation(
            groupLocation.groupId,
            groupLocation.index,
          );
          setGroupAnchor(located && located.hash === hash ? located : null);
        } else if (!result && !batch) {
          // Last resort: a hash anchored only through a group is invisible to
          // the single and batch contracts, so fall back to the groups
          // contract's print events when neither resolved. Let a lookup failure
          // propagate to the error state below rather than swallowing it, so a
          // transient API error does not masquerade as "not anchored" for
          // group-only hashes.
          setGroupAnchor(await findGroupAnchorByHash(hash));
        } else {
          setGroupAnchor(null);
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
    [hash, valid, batchOwner, ownerParam, groupLocation],
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
    if (!valid || !txId || anchor || batchAnchor || groupAnchor || error) return;
    const id = setInterval(() => void loadAnchor(false), 15000);
    return () => clearInterval(id);
  }, [valid, txId, anchor, batchAnchor, groupAnchor, error, loadAnchor]);

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
          <div className="order-last ml-auto"><ThemeToggle /></div>
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            &larr; ThesisLock
          </Link>
          <Link href="/search" className="text-foreground/60 hover:text-foreground">
            Search
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
        <div className="order-last ml-auto"><ThemeToggle /></div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          &larr; ThesisLock
        </Link>
        <Link href="/search" className="text-foreground/60 hover:text-foreground">
          Search
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

      <div className="rounded-lg border border-foreground/10 bg-card p-6">
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
            <p className="text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
            <button
              onClick={() => void loadAnchor()}
              className="mt-3 text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              Try again
            </button>
          </div>
        ) : !preferGroup && preferBatch && batchAnchor && batchOwner ? (
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
        ) : (preferGroup || !anchor) && groupAnchor ? (
          <div className="mt-4 pt-4 border-t border-foreground/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-foreground/20 text-foreground/70 uppercase tracking-wide">
                Group anchor
              </span>
              <p className="text-foreground/80 text-sm">
                Anchored in Group #{groupAnchor.groupId}
                {groupAnchor.groupName ? ` (${groupAnchor.groupName})` : ""}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  Anchored by
                </div>
                <a
                  href={explorerAddressUrl(groupAnchor.anchoredBy)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs md:text-sm break-all underline hover:no-underline"
                >
                  {groupAnchor.anchoredBy}
                </a>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  Label
                </div>
                <code className="font-mono text-xs md:text-sm">
                  {groupAnchor.label || "(none)"}
                </code>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  Stacks block
                </div>
                <code className="font-mono text-sm">
                  {groupAnchor.stacksBlock}
                </code>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  Group
                </div>
                <Link
                  href={`/groups/${groupAnchor.groupId}`}
                  className="text-sm underline hover:no-underline"
                >
                  View group history
                </Link>
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
        <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-6">
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
        <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-6">
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

      <div className="mt-10 rounded-lg border border-foreground/10 bg-card p-6">
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
              <p className="text-red-600 dark:text-red-400" role="alert">
                {verifyError}
              </p>
            ) : verifying ? (
              <p className="text-foreground/60">Hashing...</p>
            ) : verifyHash ? (
              verifyHash === hash ? (
                <p className="text-green-700 dark:text-green-400">
                  Match. This file is the anchored document.
                </p>
              ) : (
                <p className="text-red-600 dark:text-red-400">
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
