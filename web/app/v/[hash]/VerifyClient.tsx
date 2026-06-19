"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import ThemeToggle from "@/app/components/ThemeToggle";
import WatchlistButton from "@/app/components/WatchlistButton";
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
import { isHiroAvailable } from "@/lib/fetchWithRetry";
import { downloadCertificate } from "@/lib/downloadCertificate";
import FileDropZone from "@/app/components/FileDropZone";
import { useI18n } from "@/app/components/I18nProvider";
import { getTemplate, parseLabel } from "@/lib/templates";

// Renders an anchor label. When the label was created from a template, it parses
// back into a template badge and a key-value list of fields; otherwise it shows
// the raw label exactly as stored on chain.
function LabelValue({ label }: { label: string }) {
  const { t } = useI18n();
  const parsed = parseLabel(label);
  const template = parsed.templateId ? getTemplate(parsed.templateId) : undefined;

  if (!template) {
    return (
      <code className="font-mono text-xs md:text-sm">
        {label || t("verify.fields.noLabel")}
      </code>
    );
  }

  return (
    <div>
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-foreground/60 border border-foreground/15 rounded px-1.5 py-0.5 mb-2">
        <span
          aria-hidden="true"
          className="inline-flex h-4 w-4 items-center justify-center rounded bg-heading text-background text-[9px] font-semibold"
        >
          {template.icon}
        </span>
        {t("templates.verify.badge")}: {template.name}
      </span>
      <dl className="space-y-1">
        {Object.entries(parsed.fields).map(([key, value]) => {
          const field = template.fields.find((f) => f.key === key);
          return (
            <div key={key} className="flex gap-2 text-xs">
              <dt className="text-foreground/50 shrink-0">
                {field?.name ?? key}
              </dt>
              <dd className="font-mono break-all">{value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

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
  const { t } = useI18n();

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
  const [hiroDown, setHiroDown] = useState(false);

  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyHash, setVerifyHash] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [shareUrl, setShareUrl] = useState("");
  const [copiedShare, setCopiedShare] = useState(false);
  const [copyShareFailed, setCopyShareFailed] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copiedEmbed, setCopiedEmbed] = useState<"markdown" | "html" | null>(
    null,
  );
  const [copyEmbedFailed, setCopyEmbedFailed] = useState(false);

  useEffect(() => {
    setShareUrl(window.location.href);
    setOrigin(window.location.origin);
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

  // The compare link carries enough to resolve the same record on the compare
  // page. It mirrors the display precedence below: a batch record passes its
  // owner, and a group record passes its exact { group-id, index } location so
  // a hash anchored in several groups still compares the row shown here rather
  // than the first group event that matches the hash.
  const compareHref = useMemo(() => {
    const params = new URLSearchParams({ a: hash });
    if (!preferGroup && preferBatch && batchAnchor && batchOwner) {
      params.set("ownerA", batchOwner);
    } else if ((preferGroup || !anchor) && groupAnchor) {
      params.set("groupA", String(groupAnchor.groupId));
      params.set("giA", String(groupAnchor.index));
    }
    return `/compare?${params.toString()}`;
  }, [
    hash,
    preferGroup,
    preferBatch,
    batchAnchor,
    batchOwner,
    anchor,
    groupAnchor,
  ]);

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
    const text = t("verify.tweetText");
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text,
    )}&url=${encodeURIComponent(publicVerifyUrl)}`;
  })();

  // The badge endpoint resolves single anchors by hash alone, but a batch
  // record is keyed by {hash, owner}, so pass the owner when the page is
  // showing a batch anchor.
  const badgeOwner = preferBatch && batchOwner ? batchOwner : null;
  const badgeSrc = origin
    ? `${origin}/api/badge/${hash}${badgeOwner ? `?owner=${badgeOwner}` : ""}`
    : "";
  const embedMarkdown = badgeSrc
    ? `[![ThesisLock](${badgeSrc})](${publicVerifyUrl || `${origin}/v/${hash}`})`
    : "";
  const embedHtml = badgeSrc
    ? `<a href="${publicVerifyUrl || `${origin}/v/${hash}`}"><img src="${badgeSrc}" alt="ThesisLock Verified" /></a>`
    : "";

  const copyEmbed = async (kind: "markdown" | "html") => {
    const text = kind === "markdown" ? embedMarkdown : embedHtml;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmbed(kind);
      setCopyEmbedFailed(false);
      setTimeout(() => setCopiedEmbed(null), 1500);
    } catch {
      setCopyEmbedFailed(true);
      setTimeout(() => setCopyEmbedFailed(false), 1500);
    }
  };

  const loadAnchor = useCallback(
    async (showLoading = true) => {
      if (!valid) {
        setLoading(false);
        return;
      }
      // On a silent retry keep any existing outage error visible until this
      // attempt resolves. Clearing it eagerly would drop the render through to
      // the "not anchored" branch mid-flight, since loading stays false.
      if (showLoading) {
        setLoading(true);
        setError(null);
      }
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
        setHiroDown(false);
        setError(null);
      } catch (e) {
        console.error(e);
        // Tell "the API is down" apart from a genuine lookup failure so the
        // page can show a specific message and auto-retry instead of leaving
        // the user to refresh manually.
        const apiUp = await isHiroAvailable();
        setHiroDown(!apiUp);
        setError(
          apiUp
            ? t("verify.error.lookupFailed")
            : t("verify.error.hiroUnavailable"),
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [hash, valid, batchOwner, ownerParam, groupLocation, t],
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

  // When the lookup failed because the Hiro API was down, retry on a timer so
  // the record appears on its own once the API recovers.
  useEffect(() => {
    if (!hiroDown) return;
    const id = setInterval(() => void loadAnchor(false), 15000);
    return () => clearInterval(id);
  }, [hiroDown, loadAnchor]);

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
        e instanceof Error ? e.message : t("verify.error.hashFailed"),
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
          <Link
            href="/verify-bulk"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.bulkVerify")}
          </Link>
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
            href="/explorer"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.explorer")}
          </Link>
          <WatchlistNavLink />
        </div>
        <h1 className="text-3xl mt-8 mb-2">{t("verify.invalidHash.title")}</h1>
        <p className="text-foreground/70">
          {t("verify.invalidHash.body")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm flex-wrap">
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
          href="/explorer"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.explorer")}
        </Link>
          <WatchlistNavLink />
      </div>
      <h1 className="text-3xl mt-8 mb-6">{t("verify.recordTitle")}</h1>

      <div className="rounded-lg border border-foreground/10 bg-card p-6">
        <div className="mb-4">
          <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
            {t("verify.fields.hash")}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="font-mono text-xs md:text-sm break-all">{hash}</code>
            <WatchlistButton type="hash" value={hash} showLabel />
          </div>
        </div>

        <div role="status" aria-live="polite" aria-busy={loading || undefined}>
        {loading ? (
          <p className="text-foreground/60">{t("verify.lookingUp")}</p>
        ) : error ? (
          <div className="mt-4 pt-4 border-t border-foreground/10">
            <p className="text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
            <button
              onClick={() => void loadAnchor()}
              className="mt-3 text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              {t("common.actions.tryAgain")}
            </button>
          </div>
        ) : !preferGroup && preferBatch && batchAnchor && batchOwner ? (
          <div className="mt-4 pt-4 border-t border-foreground/10">
            <p className="text-foreground/80 text-sm mb-3">
              {t("verify.batch.heading")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  {t("verify.fields.owner")}
                </div>
                <Link
                  href={`/u/${batchOwner}`}
                  className="font-mono text-xs md:text-sm break-all underline hover:no-underline"
                >
                  {batchOwner}
                </Link>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  {t("verify.fields.label")}
                </div>
                <LabelValue label={batchAnchor.label} />
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  {t("verify.fields.stacksBlock")}
                </div>
                <code className="font-mono text-sm">
                  {batchAnchor.stacksBlock}
                </code>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  {t("verify.fields.burnBlock")}
                </div>
                <code className="font-mono text-sm">
                  {batchAnchor.burnBlock}
                </code>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  {t("verify.fields.batchId")}
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
                {t("verify.group.badge")}
              </span>
              <p className="text-foreground/80 text-sm">
                {groupAnchor.groupName
                  ? t("verify.group.anchoredInNamed", {
                      id: groupAnchor.groupId,
                      name: groupAnchor.groupName,
                    })
                  : t("verify.group.anchoredIn", { id: groupAnchor.groupId })}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  {t("verify.fields.anchoredBy")}
                </div>
                <Link
                  href={`/u/${groupAnchor.anchoredBy}`}
                  className="font-mono text-xs md:text-sm break-all underline hover:no-underline"
                >
                  {groupAnchor.anchoredBy}
                </Link>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  {t("verify.fields.label")}
                </div>
                <LabelValue label={groupAnchor.label} />
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  {t("verify.fields.stacksBlock")}
                </div>
                <code className="font-mono text-sm">
                  {groupAnchor.stacksBlock}
                </code>
              </div>
              <div>
                <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                  {t("verify.fields.group")}
                </div>
                <Link
                  href={`/groups/${groupAnchor.groupId}`}
                  className="text-sm underline hover:no-underline"
                >
                  {t("verify.group.viewHistory")}
                </Link>
              </div>
            </div>
          </div>
        ) : !anchor ? (
          txId ? (
            <div className="mt-4 pt-4 border-t border-foreground/10">
              <p className="text-foreground/80">
                {t("verify.pending.body")}
              </p>
              <a
                href={explorerTxUrl(txId)}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-3 text-sm underline hover:no-underline"
              >
                {t("verify.pending.viewTx")}
              </a>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-foreground/10">
              <p className="text-foreground/80">
                {t("verify.notAnchored.body")}
              </p>
              {!batchOwner && (
                <p className="mt-3 text-sm text-foreground/70">
                  {t("verify.notAnchored.batchHintPrefix")}{" "}
                  <code className="font-mono">?owner=&lt;principal&gt;</code>{" "}
                  {t("verify.notAnchored.batchHintSuffix")}
                </p>
              )}
              <Link
                href="/anchor"
                className="inline-block mt-3 text-sm underline hover:no-underline"
              >
                {t("verify.notAnchored.cta")}
              </Link>
              <div className="mt-4 pt-4 border-t border-foreground/10 flex items-center gap-3 flex-wrap">
                <p className="text-sm text-foreground/70">
                  Want to know when this hash gets anchored? Add it to your
                  watchlist.
                </p>
                <WatchlistButton type="hash" value={hash} showLabel />
              </div>
            </div>
          )
        ) : (
          <div className="mt-4 pt-4 border-t border-foreground/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                {t("verify.fields.anchoredBy")}
              </div>
              <Link
                href={`/u/${anchor.anchoredBy}`}
                className="font-mono text-xs md:text-sm break-all underline hover:no-underline"
              >
                {anchor.anchoredBy}
              </Link>
            </div>
            <div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                {t("verify.fields.label")}
              </div>
              <LabelValue label={anchor.label} />
            </div>
            <div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                {t("verify.fields.stacksBlock")}
              </div>
              <code className="font-mono text-sm">{anchor.stacksBlock}</code>
            </div>
            <div>
              <div className="text-xs text-foreground/60 uppercase tracking-wide mb-1">
                {t("verify.fields.burnBlock")}
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
            {t("verify.proof.heading")}
          </div>
          <p className="text-sm text-foreground/80">
            {t("verify.proof.mintedByPrefix", { tokenId: proof.tokenId })}{" "}
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

      {(anchor || (batchAnchor && batchOwner) || groupAnchor) && (
        <div className="mt-6">
          <Link
            href={compareHref}
            className="inline-flex items-center text-sm underline hover:no-underline"
          >
            {t("verify.compareLink")} &rarr;
          </Link>
        </div>
      )}

      {(anchor || (batchAnchor && batchOwner)) && (
        <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-6">
          <h2 className="text-xl mb-2">{t("verify.share.heading")}</h2>
          <p className="text-foreground/70 text-sm mb-4">
            {t("verify.share.body")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyShareUrl}
              disabled={!publicVerifyUrl}
              aria-label={t("verify.share.copyLinkAria")}
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
            >
              {copiedShare
                ? t("verify.share.linkCopied")
                : copyShareFailed
                  ? t("verify.share.copyFailed")
                  : t("verify.share.copyLink")}
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
              aria-label={t("verify.share.downloadCertAria")}
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              {t("verify.share.downloadCert")}
            </button>
            {publicVerifyUrl ? (
              <a
                href={tweetIntent}
                target="_blank"
                rel="noreferrer"
                className="text-sm px-3 py-2 rounded-md bg-heading text-background hover:opacity-90 transition"
              >
                {t("verify.share.shareOnX")}
              </a>
            ) : (
              <button
                disabled
                className="text-sm px-3 py-2 rounded-md bg-heading text-background opacity-50 cursor-not-allowed"
              >
                {t("verify.share.shareOnX")}
              </button>
            )}
          </div>
        </div>
      )}

      {(anchor || (batchAnchor && batchOwner)) && (
        <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-6">
          <h2 className="text-xl mb-2">{t("verify.embed.heading")}</h2>
          <p className="text-foreground/70 text-sm mb-4">
            {t("verify.embed.body")}
          </p>
          {badgeSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={badgeSrc}
              alt={t("verify.embed.badgeAlt")}
              height={20}
              className="mb-4"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void copyEmbed("markdown")}
              disabled={!embedMarkdown}
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
            >
              {copiedEmbed === "markdown"
                ? t("verify.embed.markdownCopied")
                : copyEmbedFailed
                  ? t("verify.embed.copyFailed")
                  : t("verify.embed.copyMarkdown")}
            </button>
            <button
              onClick={() => void copyEmbed("html")}
              disabled={!embedHtml}
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
            >
              {copiedEmbed === "html"
                ? t("verify.embed.htmlCopied")
                : copyEmbedFailed
                  ? t("verify.embed.copyFailed")
                  : t("verify.embed.copyHtml")}
            </button>
            <Link
              href="/embed"
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              {t("verify.embed.customize")}
            </Link>
          </div>
        </div>
      )}

      <div className="mt-10 rounded-lg border border-foreground/10 bg-card p-6">
        <h2 className="text-xl mb-2">{t("verify.file.heading")}</h2>
        <p className="text-foreground/70 text-sm mb-4">
          {t("verify.file.body")}
        </p>
        <FileDropZone
          onFile={(f) => void onVerifyFile(f)}
          ariaLabel={t("verify.file.dropAria")}
        >
          {verifyFile ? (
            <p className="text-foreground/80 font-medium">{verifyFile.name}</p>
          ) : (
            <p className="text-foreground/60">
              {t("verify.file.dropPrompt")}
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
              <p className="text-foreground/60">{t("verify.file.hashing")}</p>
            ) : verifyHash ? (
              verifyHash === hash ? (
                <p className="text-green-700 dark:text-green-400">
                  {t("verify.file.match")}
                </p>
              ) : (
                <p className="text-red-600 dark:text-red-400">
                  {t("verify.file.noMatch")}
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
