"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useParams } from "next/navigation";
import {
  addMember,
  anchorToGroup,
  explorerTxUrl,
  getGroup,
  getGroupAnchorCount,
  getRecentGroupAnchors,
  hashFile,
  isMember,
  removeMember,
  type Group,
  type GroupAnchor,
} from "@/lib/stacks";
import { fetchGroupMembers } from "@/lib/groups";
import { formatBytes } from "@/lib/format";
import { truncateAddress, useWallet } from "@/lib/wallet";
import FileDropZone from "@/app/components/FileDropZone";

const ASCII_REGEX = /^[\x20-\x7E]*$/;
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = Number(params.id);
  const validId = Number.isInteger(groupId) && groupId > 0;

  const {
    address,
    connecting,
    error: walletError,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [anchorCount, setAnchorCount] = useState(0);
  const [anchors, setAnchors] = useState<GroupAnchor[]>([]);
  const [member, setMemberState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const copyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 1500);
    } catch {
      // Clipboard can be unavailable in non-secure contexts; ignore.
    }
  };

  const isAdmin = !!address && !!group && group.admin === address;

  const load = useCallback(async () => {
    if (!validId) {
      setLoading(false);
      setLoadError("Invalid group id.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [g, count, recent, mems] = await Promise.all([
        getGroup(groupId),
        getGroupAnchorCount(groupId),
        getRecentGroupAnchors(groupId),
        fetchGroupMembers(groupId),
      ]);
      setGroup(g);
      setAnchorCount(count);
      setAnchors(recent.filter((a): a is GroupAnchor => a !== null));
      setMembers(mems);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load group.");
    } finally {
      setLoading(false);
    }
  }, [groupId, validId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!address || !validId) {
      setMemberState(false);
      return;
    }
    void isMember(groupId, address).then(setMemberState);
  }, [address, groupId, validId]);

  // Add member
  const [newMember, setNewMember] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);

  const submitAddMember = () => {
    const value = newMember.trim().toUpperCase();
    if (!STX_PRINCIPAL.test(value)) {
      setMemberError("Enter a valid Stacks principal (starts with SP or SM).");
      return;
    }
    setMemberError(null);
    setAddPending(true);
    addMember(
      groupId,
      value,
      () => {
        setAddPending(false);
        setNewMember("");
      },
      () => setAddPending(false),
    );
  };

  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const submitRemoveMember = (principal: string) => {
    setRemovingMember(principal);
    removeMember(
      groupId,
      principal,
      () => setRemovingMember(null),
      () => setRemovingMember(null),
    );
  };

  // Anchor to group
  const [file, setFile] = useState<File | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [hashing, setHashing] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [anchorPending, setAnchorPending] = useState(false);
  const [anchorTxId, setAnchorTxId] = useState<string | null>(null);

  const onFileSelect = useCallback(async (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    setHash(null);
    setHashError(null);
    setAnchorTxId(null);
    setHashing(true);
    try {
      setHash(await hashFile(selected));
    } catch (e) {
      setHashError(e instanceof Error ? e.message : "Could not hash this file.");
    } finally {
      setHashing(false);
    }
  }, []);

  const onLabelChange = (next: string) => {
    if (!ASCII_REGEX.test(next)) {
      setLabelError("Labels must be ASCII only.");
      setLabel(next.slice(0, 64));
      return;
    }
    setLabelError(null);
    setLabel(next.slice(0, 64));
  };

  const submitAnchor = () => {
    if (!hash || !member || anchorPending) return;
    setAnchorPending(true);
    setAnchorTxId(null);
    anchorToGroup(
      groupId,
      hash,
      label,
      (txId) => {
        setAnchorPending(false);
        setAnchorTxId(txId);
        setFile(null);
        setHash(null);
        setLabel("");
      },
      () => setAnchorPending(false),
    );
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <div className="order-last ml-auto"><ThemeToggle /></div>
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            &larr; ThesisLock
          </Link>
          <Link
            href="/groups"
            className="text-foreground/60 hover:text-foreground"
          >
            Groups
          </Link>
          <Link
            href="/anchors"
            className="text-foreground/60 hover:text-foreground"
          >
            My Anchors
          </Link>
          <Link href="/feed" className="text-foreground/60 hover:text-foreground">
            Feed
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
        <p className="mb-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {walletError}
        </p>
      )}

      {loading ? (
        <p className="text-foreground/60">Loading group...</p>
      ) : loadError ? (
        <p className="text-red-600 dark:text-red-400">{loadError}</p>
      ) : !group ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">
            Group #{params.id} does not exist.
          </p>
          <Link
            href="/groups"
            className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
          >
            Back to groups
          </Link>
        </div>
      ) : (
        <>
          <h1 className="text-3xl mb-2">{group.name}</h1>
          <div className="text-sm text-foreground/60 mb-8">
            Group #{groupId} &middot; admin{" "}
            <code className="font-mono">{truncateAddress(group.admin)}</code>{" "}
            &middot; {members.length} member{members.length === 1 ? "" : "s"}{" "}
            &middot; {anchorCount} anchor{anchorCount === 1 ? "" : "s"}
          </div>

          {isAdmin && (
            <div className="rounded-lg border border-foreground/10 bg-card p-6 mb-8">
              <h2 className="text-lg mb-3">Members</h2>
              <label
                htmlFor="new-member"
                className="block text-sm text-foreground/60 mb-2"
              >
                Add a member by Stacks principal
              </label>
              <div className="flex gap-2 flex-wrap">
                <input
                  id="new-member"
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  placeholder="SP..."
                  disabled={addPending}
                  aria-invalid={memberError ? true : undefined}
                  className="flex-1 min-w-0 px-3 py-2 rounded-md border border-foreground/15 bg-card font-mono text-sm focus:outline-none focus:border-foreground/50 disabled:opacity-60"
                />
                <button
                  onClick={submitAddMember}
                  disabled={addPending || !newMember.trim()}
                  className="text-sm px-4 py-2 rounded-md bg-heading text-background hover:opacity-90 disabled:opacity-40 transition"
                >
                  {addPending ? "Signing..." : "Add"}
                </button>
              </div>
              {memberError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
                  {memberError}
                </p>
              )}
              <p className="mt-2 text-xs text-foreground/50">
                After the transaction confirms, refresh to see the updated list.
              </p>

              <ul className="mt-4 space-y-2" role="list">
                {members.map((m) => (
                  <li
                    key={m}
                    className="flex items-center justify-between gap-3 text-sm border-t border-foreground/10 pt-2"
                  >
                    <code className="font-mono truncate">
                      {truncateAddress(m, 6, 6)}
                      {m === group.admin ? " (admin)" : ""}
                    </code>
                    {m !== group.admin && (
                      <button
                        onClick={() => submitRemoveMember(m)}
                        disabled={removingMember === m}
                        className="text-xs px-2 py-1 rounded border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50 shrink-0"
                      >
                        {removingMember === m ? "Signing..." : "Remove"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-foreground/10 bg-card p-6 mb-8">
            <h2 className="text-lg mb-1">Anchor a document to this group</h2>
            <p className="text-foreground/70 text-sm mb-4">
              The file is hashed in your browser. Only the hash is recorded on
              chain.
            </p>
            {!member ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Only group members can anchor documents here. Ask the admin to
                add your wallet.
              </p>
            ) : (
              <>
                <FileDropZone
                  onFile={(f) => void onFileSelect(f)}
                  disabled={anchorPending}
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
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
                    {hashError}
                  </p>
                )}

                {(hashing || hash) && (
                  <div className="mt-4" aria-live="polite" aria-busy={hashing}>
                    <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                      SHA-256
                    </div>
                    {hashing ? (
                      <p className="font-mono text-sm text-foreground/50">
                        Hashing...
                      </p>
                    ) : (
                      <code className="font-mono text-xs break-all bg-foreground/5 px-3 py-2 rounded block">
                        {hash}
                      </code>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  <label
                    htmlFor="anchor-label"
                    className="block text-sm text-foreground/60 mb-2"
                  >
                    Label (optional, ASCII, up to 64 chars)
                  </label>
                  <input
                    id="anchor-label"
                    value={label}
                    onChange={(e) => onLabelChange(e.target.value)}
                    placeholder="e.g. chapter-3-draft"
                    maxLength={64}
                    disabled={anchorPending}
                    aria-invalid={labelError ? true : undefined}
                    className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-card focus:outline-none focus:border-foreground/50 disabled:opacity-60"
                  />
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span
                      className={labelError ? "text-red-600 dark:text-red-400" : "text-transparent"}
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
                  onClick={submitAnchor}
                  disabled={!hash || hashing || anchorPending || !!labelError}
                  className="mt-4 px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  {anchorPending
                    ? "Awaiting wallet signature..."
                    : "Anchor to group"}
                </button>

                {anchorTxId && (
                  <p className="mt-4 text-sm text-green-700 dark:text-green-400">
                    Anchor submitted.{" "}
                    <a
                      href={explorerTxUrl(anchorTxId)}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:no-underline"
                    >
                      View transaction
                    </a>
                    . It will appear below once confirmed.{" "}
                    <button
                      onClick={() => void load()}
                      className="underline hover:no-underline"
                    >
                      Refresh
                    </button>
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg">Recent anchors</h2>
            <button
              onClick={() => void load()}
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
            >
              Refresh
            </button>
          </div>
          <p className="text-foreground/60 text-sm mb-4">
            Group anchors live in the thesislock-groups contract, keyed by group
            and index. Copy a hash to confirm it on chain against this
            group&apos;s history.
          </p>

          {anchors.length === 0 ? (
            <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
              <p className="text-foreground/70">
                No documents anchored to this group yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3" role="list">
              {anchors.map((anchor, idx) => (
                <div
                  key={`${anchor.hash}-${idx}`}
                  role="listitem"
                  className="rounded-lg border border-foreground/10 bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        Hash
                      </div>
                      <code className="font-mono text-sm">
                        {truncateHash(anchor.hash)}
                      </code>
                    </div>
                    <button
                      onClick={() => void copyHash(anchor.hash)}
                      aria-label="Copy hash"
                      className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition shrink-0"
                    >
                      {copiedHash === anchor.hash ? "Copied" : "Copy hash"}
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        Label
                      </div>
                      <code className="font-mono text-xs">
                        {anchor.label || "(none)"}
                      </code>
                    </div>
                    <div>
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        Anchored by
                      </div>
                      <code className="font-mono text-xs">
                        {truncateAddress(anchor.anchoredBy)}
                      </code>
                    </div>
                    <div>
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        Stacks block
                      </div>
                      <code className="font-mono text-xs">
                        {anchor.stacksBlock}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
