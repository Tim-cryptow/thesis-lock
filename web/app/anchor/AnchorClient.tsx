"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import TemplateSelector from "@/app/components/TemplateSelector";
import TemplateFields from "@/app/components/TemplateFields";
import {
  GENERIC_TEMPLATE,
  GENERIC_TEMPLATE_ID,
  buildLabel,
  getTemplate,
  isTemplateValid,
} from "@/lib/templates";
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
import { useTx } from "@/app/components/TxProvider";
import { useI18n } from "@/app/components/I18nProvider";

const ASCII_REGEX = /^[\x20-\x7E]*$/;
const MAX_BATCH = 10;

type Mode = "single" | "batch";

type BatchRow = {
  id: string;
  file: File;
  hash: string | null;
  hashing: boolean;
  hashError: string | null;
  // Each file carries its own template selection and field values. The label
  // submitted on chain is derived from these via buildLabel at submit time.
  templateId: string;
  fieldValues: Record<string, string>;
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

// Returns a stable error id (not user-facing text) so the render site can
// translate it via t(). null means valid.
function validateLabel(next: string): {
  value: string;
  error: string | null;
} {
  if (!ASCII_REGEX.test(next)) {
    return { value: next.slice(0, 64), error: "asciiOnly" };
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

  const { trackTx, pendingCount } = useTx();

  const { t } = useI18n();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("single");

  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);

  // Template selection for single mode. The library page links here with
  // ?template=<id> to pre-select a template.
  const [templateId, setTemplateId] = useState<string>(GENERIC_TEMPLATE_ID);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const template = getTemplate(templateId) ?? GENERIC_TEMPLATE;
  const isGenericTemplate = templateId === GENERIC_TEMPLATE_ID;
  const effectiveSingleLabel = isGenericTemplate
    ? label
    : buildLabel(template, fieldValues);

  // The batch default template seeds every newly added file and re-applies to
  // all rows when changed; individual rows can override it afterward.
  const [batchTemplateId, setBatchTemplateId] =
    useState<string>(GENERIC_TEMPLATE_ID);

  useEffect(() => {
    const param = searchParams.get("template");
    if (param && getTemplate(param)) {
      setTemplateId(param);
      setFieldValues({});
    }
  }, [searchParams]);

  const setFieldValue = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const onSelectTemplate = (id: string) => {
    setTemplateId(id);
    setFieldValues({});
  };
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
        e instanceof Error ? e.message : t("anchor.errors.hashFailed"),
      );
    } finally {
      setHashing(false);
    }
  }, [t]);

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
        setBatchLimitNotice(t("anchor.batch.limitReached", { max: MAX_BATCH }));
        return prev;
      }
      const accepted = incomingArr.slice(0, remaining);
      if (incomingArr.length > accepted.length) {
        setBatchLimitNotice(
          t("anchor.batch.partiallyAdded", {
            added: accepted.length,
            total: incomingArr.length,
            max: MAX_BATCH,
          }),
        );
      }
      const newRows: BatchRow[] = accepted.map((f) => ({
        id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: f,
        hash: null,
        hashing: true,
        hashError: null,
        templateId: batchTemplateId,
        fieldValues: {},
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
              e instanceof Error ? e.message : t("anchor.errors.hashFailed");
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
  }, [t, batchTemplateId]);

  const onBatchDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setBatchDragOver(false);
      addBatchFiles(e.dataTransfer.files);
    },
    [addBatchFiles],
  );

  const updateRowField = (id: string, key: string, value: string) => {
    setRows((current) =>
      current.map((r) =>
        r.id === id
          ? { ...r, fieldValues: { ...r.fieldValues, [key]: value } }
          : r,
      ),
    );
  };

  const setRowTemplate = (id: string, nextTemplateId: string) => {
    setRows((current) =>
      current.map((r) =>
        r.id === id
          ? { ...r, templateId: nextTemplateId, fieldValues: {} }
          : r,
      ),
    );
  };

  // Changing the batch default re-applies the template to every row, clearing
  // field values so each row starts fresh under the new schema.
  const onSelectBatchTemplate = (nextTemplateId: string) => {
    setBatchTemplateId(nextTemplateId);
    setRows((current) =>
      current.map((r) => ({
        ...r,
        templateId: nextTemplateId,
        fieldValues: {},
      })),
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
    !!hash &&
    !!address &&
    !pending &&
    !hashing &&
    (isGenericTemplate ? !labelError : isTemplateValid(template, fieldValues));

  const submitSingle = () => {
    if (!hash || !address) return;
    const submittingHash = hash;
    const submittingLabel = effectiveSingleLabel;
    const submittingOwner = address;
    setSubmitError(null);
    setPending(true);
    submitAnchor(submittingHash, submittingLabel, {
      onFinish: (txId) => {
        trackTx(txId, {
          hash: submittingHash,
          label: submittingLabel,
          owner: submittingOwner,
        });
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
    rows.every(
      (r) =>
        r.hash &&
        !r.hashing &&
        isTemplateValid(getTemplate(r.templateId) ?? GENERIC_TEMPLATE, r.fieldValues),
    );
  const canSubmitBatch = allRowsReady && !!address && !pending;

  const submitBatch = () => {
    if (!canSubmitBatch || !address) return;
    const entries = rows.map((r) => ({
      hash: r.hash!,
      label: buildLabel(getTemplate(r.templateId) ?? GENERIC_TEMPLATE, r.fieldValues),
    }));
    const submittingOwner = address;
    setSubmitError(null);
    setPending(true);
    submitBatchAnchor(
      entries,
      (txId) => {
        trackTx(txId, {
          hash: entries[0]?.hash,
          label: entries[0]?.label,
          owner: submittingOwner,
        });
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
    setFieldValues({});
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
          <div className="order-last ml-auto"><ThemeToggle /></div>
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.back")}
          </Link>
          <Link href="/search" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.search")}
          </Link>
          <span className="text-foreground font-medium">{t("common.nav.anchor")}</span>
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
            href="/templates"
            className="text-foreground/60 hover:text-foreground"
          >
            {t("common.nav.templates")}
          </Link>
        </div>
        <div className="flex items-center gap-3">
        {pendingCount > 0 && (
          <span
            className="text-xs font-mono px-2.5 py-1 rounded-full border border-foreground/15 text-foreground/60"
            aria-live="polite"
            title={t("common.wallet.pendingTitle")}
          >
            {t("common.wallet.pending", { count: pendingCount })}
          </span>
        )}
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
      </div>

      {walletError && (
        <p className="mb-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {walletError}
        </p>
      )}

      {singleSuccess ? (
        <>
          <h1 className="text-3xl mb-2">{t("anchor.success.single.heading")}</h1>
          <p className="text-foreground/70 mb-6">
            {t("anchor.success.single.description")}
          </p>
          <div className="rounded-lg border border-foreground/10 bg-card p-5">
            <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
              {t("anchor.success.hashLabel")}
            </div>
            <code className="font-mono text-xs break-all block mb-3">
              {singleSuccess.hash}
            </code>
            {singleSuccess.label && (
              <div className="mb-3">
                <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                  {t("anchor.success.labelLabel")}
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
                {t("anchor.success.openVerify")}
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
                  ? t("anchor.success.preparing")
                  : t("anchor.success.downloadCertificate")}
              </button>
            </div>
            {certNoticeHash === singleSuccess.hash && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                {t("anchor.success.notConfirmed")}
              </p>
            )}
          </div>
          <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-5">
            <h2 className="text-lg mb-1">{t("anchor.proof.single.heading")}</h2>
            <p className="text-foreground/70 text-sm mb-4">
              {t("anchor.proof.single.description")}
            </p>
            {mintTxId ? (
              <p className="text-sm text-green-700 dark:text-green-400">
                {t("anchor.proof.submitted")}{" "}
                <a
                  href={explorerTxUrl(mintTxId)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:no-underline"
                >
                  {t("anchor.proof.viewTransaction")}
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
                {minting ? t("anchor.proof.awaitingSignature") : t("anchor.proof.single.mint")}
              </button>
            )}
          </div>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link
              href="/anchors"
              className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
            >
              {t("anchor.success.viewMyAnchors")}
            </Link>
            <button
              onClick={startAnotherSingle}
              className="px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              {t("anchor.success.single.anchorAnother")}
            </button>
          </div>
        </>
      ) : batchSuccess ? (
        <>
          <h1 className="text-3xl mb-2">{t("anchor.success.batch.heading")}</h1>
          <p className="text-foreground/70 mb-6">
            {t("anchor.success.batch.description")}
          </p>
          <div className="space-y-3">
            {batchSuccess.entries.map((entry, idx) => (
              <div
                key={`${entry.hash}-${idx}`}
                className="rounded-lg border border-foreground/10 bg-card p-5"
              >
                <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                  {t("anchor.success.hashLabel")}
                </div>
                <code className="font-mono text-xs break-all block mb-3">
                  {entry.hash}
                </code>
                {entry.label && (
                  <div className="mb-3">
                    <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                      {t("anchor.success.labelLabel")}
                    </div>
                    <code className="font-mono text-xs">{entry.label}</code>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/v/${entry.hash}?owner=${encodeURIComponent(batchSuccess.owner)}&tx=${encodeURIComponent(batchSuccess.txId)}`}
                    className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                  >
                    {t("anchor.success.openVerify")}
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
                      ? t("anchor.success.linkCopied")
                      : copyLinkFailedHash === entry.hash
                        ? t("anchor.success.copyFailed")
                        : t("anchor.success.copyVerifyLink")}
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
                      ? t("anchor.success.preparing")
                      : t("anchor.success.downloadCertificate")}
                  </button>
                </div>
                {certNoticeHash === entry.hash && (
                  <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                    {t("anchor.success.notConfirmed")}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-lg border border-foreground/10 bg-card p-5">
            <h2 className="text-lg mb-1">{t("anchor.proof.batch.heading")}</h2>
            <p className="text-foreground/70 text-sm mb-4">
              {t("anchor.proof.batch.description")}
            </p>
            {mintProgress ? (
              <p className="text-sm text-foreground/70">
                {t("anchor.proof.minting", {
                  current: mintProgress.current,
                  total: mintProgress.total,
                })}
              </p>
            ) : mintTxId ? (
              <p className="text-sm text-green-700 dark:text-green-400">
                {batchSuccess.entries.length === 1
                  ? t("anchor.proof.batch.submittedOne")
                  : t("anchor.proof.batch.submittedMany", {
                      count: batchSuccess.entries.length,
                    })}
              </p>
            ) : (
              <button
                onClick={() => mintBatchProofs(batchSuccess.entries)}
                disabled={minting || !address}
                className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
              >
                {minting
                  ? t("anchor.proof.awaitingSignature")
                  : batchSuccess.entries.length === 1
                    ? t("anchor.proof.batch.mintOne")
                    : t("anchor.proof.batch.mintMany", {
                        count: batchSuccess.entries.length,
                      })}
              </button>
            )}
          </div>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link
              href="/anchors"
              className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
            >
              {t("anchor.success.viewMyAnchors")}
            </Link>
            <button
              onClick={startAnotherBatch}
              className="px-6 py-3 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              {t("anchor.success.batch.anchorAnother")}
            </button>
          </div>
        </>
      ) : (
        <>
      <h1 className="text-3xl mb-2">{t("anchor.form.heading")}</h1>
      <p className="text-foreground/70 mb-6">
        {t("anchor.form.intro")}
      </p>

      <div
        role="group"
        aria-label={t("anchor.form.modeGroupAria")}
        className="inline-flex rounded-md border border-foreground/15 p-1 mb-8 bg-card"
      >
        <button
          onClick={() => setMode("single")}
          disabled={pending}
          aria-label={t("anchor.form.singleModeAria")}
          aria-pressed={mode === "single"}
          className={`text-sm px-4 py-2 rounded transition ${
            mode === "single"
              ? "bg-heading text-background"
              : "text-foreground/70 hover:text-foreground"
          } disabled:opacity-50`}
        >
          {t("anchor.form.singleMode")}
        </button>
        <button
          onClick={() => setMode("batch")}
          disabled={pending}
          aria-label={t("anchor.form.batchModeAria", { max: MAX_BATCH })}
          aria-pressed={mode === "batch"}
          className={`text-sm px-4 py-2 rounded transition ${
            mode === "batch"
              ? "bg-heading text-background"
              : "text-foreground/70 hover:text-foreground"
          } disabled:opacity-50`}
        >
          {t("anchor.form.batchMode", { max: MAX_BATCH })}
        </button>
      </div>

      {mode === "single" ? (
        <>
          <FileDropZone
            onFile={(f) => void onFileSelect(f)}
            disabled={pending}
            ariaLabel={t("anchor.single.dropZoneAria")}
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
                {t("anchor.single.dropZonePrompt")}
              </p>
            )}
          </FileDropZone>

          {hashError && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
              {hashError}
            </p>
          )}

          {(hashing || hash) && (
            <div
              className="mt-6"
              role="region"
              aria-label={t("anchor.single.hashRegionAria")}
              aria-live="polite"
              aria-busy={hashing}
            >
              <div className="block text-sm text-foreground/60 mb-2">
                {t("anchor.single.sha256")}
              </div>
              {hashing ? (
                <p className="font-mono text-sm text-foreground/50">
                  {t("anchor.single.hashing")}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs md:text-sm break-all bg-foreground/5 px-3 py-2 rounded flex-1">
                    {hash}
                  </code>
                  <button
                    onClick={copyHash}
                    aria-label={t("anchor.single.copyHashAria")}
                    className="text-xs px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition shrink-0"
                  >
                    {copied ? t("common.actions.copied") : copyFailed ? t("anchor.single.copyFailed") : t("common.actions.copy")}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <TemplateSelector
              selectedId={templateId}
              onSelect={onSelectTemplate}
            />
          </div>

          {isGenericTemplate ? (
            <div className="mt-6">
              <label
                htmlFor="label"
                className="block text-sm text-foreground/60 mb-2"
              >
                {t("anchor.label.fieldLabel")}
              </label>
              <input
                id="label"
                value={label}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder={t("anchor.label.placeholder")}
                maxLength={64}
                aria-describedby="label-status"
                aria-invalid={labelError ? true : undefined}
                className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-card focus:outline-none focus:border-foreground/50"
              />
              <div
                id="label-status"
                className="mt-1 flex items-center justify-between text-xs"
              >
                <span
                  className={labelError ? "text-red-600 dark:text-red-400" : "text-transparent"}
                  role={labelError ? "alert" : undefined}
                >
                  {labelError ? t("anchor.label.asciiOnly") : "."}
                </span>
                <span className="text-foreground/50 font-mono">
                  {label.length}/64
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <TemplateFields
                template={template}
                values={fieldValues}
                onChange={setFieldValue}
                disabled={pending}
              />
            </div>
          )}

          <button
            onClick={submitSingle}
            disabled={!canSubmitSingle}
            className="mt-8 w-full px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            {pending
              ? registerProgress
                ? t("anchor.submit.registering", {
                    current: registerProgress.current,
                    total: registerProgress.total,
                  })
                : t("anchor.submit.awaitingSignature")
              : t("anchor.submit.single")}
          </button>
          <p className="mt-3 text-xs text-foreground/50 text-center">
            {t("anchor.submit.singleHelp")}
          </p>
        </>
      ) : (
        <>
          <div className="mb-6">
            <TemplateSelector
              variant="compact"
              selectId="batch-default-template"
              label={t("templates.batch.defaultHeading")}
              selectedId={batchTemplateId}
              onSelect={onSelectBatchTemplate}
            />
            <p className="mt-1 text-xs text-foreground/50">
              {t("templates.batch.defaultDescription")}
            </p>
          </div>

          <div
            role="button"
            tabIndex={pending ? -1 : 0}
            aria-label={t("anchor.batch.dropZoneAria", { max: MAX_BATCH })}
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
              {t("anchor.batch.dropZonePrompt", {
                max: MAX_BATCH,
                added: rows.length,
              })}
            </p>
          </div>

          {batchLimitNotice && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">{batchLimitNotice}</p>
          )}

          {rows.length > 0 && (
            <div className="mt-6 space-y-3">
              {rows.map((row, idx) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-foreground/10 bg-card p-4"
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
                      aria-label={t("anchor.batch.removeFileAria", { name: row.file.name })}
                      className="text-xs px-2 py-1 rounded border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
                    >
                      {t("anchor.batch.remove")}
                    </button>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                      {t("anchor.single.sha256")}
                    </div>
                    {row.hashing ? (
                      <p className="font-mono text-xs text-foreground/50">
                        {t("anchor.single.hashing")}
                      </p>
                    ) : row.hashError ? (
                      <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                        {row.hashError}
                      </p>
                    ) : (
                      <code className="font-mono text-xs">
                        {row.hash ? truncateHashShort(row.hash) : "-"}
                      </code>
                    )}
                  </div>

                  <div className="mt-3">
                    <TemplateSelector
                      variant="compact"
                      selectId={`row-template-${row.id}`}
                      label={t("templates.batch.overrideLabel")}
                      selectedId={row.templateId}
                      onSelect={(id) => setRowTemplate(row.id, id)}
                    />
                  </div>

                  <div className="mt-3">
                    <TemplateFields
                      template={getTemplate(row.templateId) ?? GENERIC_TEMPLATE}
                      values={row.fieldValues}
                      onChange={(key, value) =>
                        updateRowField(row.id, key, value)
                      }
                      disabled={pending}
                      idPrefix={`row-${row.id}`}
                    />
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
                ? t("anchor.submit.registering", {
                    current: registerProgress.current,
                    total: registerProgress.total,
                  })
                : t("anchor.submit.awaitingSignature")
              : t("anchor.submit.batch", { count: rows.length })}
          </button>
          <p className="mt-3 text-xs text-foreground/50 text-center">
            {t("anchor.submit.batchHelp")}
          </p>
        </>
      )}

      {pending && (
        <p className="mt-4 text-sm text-foreground/60 text-center">
          {t("anchor.submit.doNotNavigate")}
        </p>
      )}

      {submitError && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400 text-center" role="alert">
          {submitError}
        </p>
      )}
        </>
      )}
    </div>
  );
}
