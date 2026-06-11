"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { createGroup, explorerTxUrl } from "@/lib/stacks";
import { fetchMyGroups, type GroupSummary } from "@/lib/groups";
import { truncateAddress, useWallet } from "@/lib/wallet";

const ASCII_REGEX = /^[\x20-\x7E]*$/;

export default function GroupsPage() {
  const {
    address,
    connecting,
    error: walletError,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createTxId, setCreateTxId] = useState<string | null>(null);

  const loadGroups = useCallback(async (owner: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      setGroups(await fetchMyGroups(owner));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!address) {
      setGroups([]);
      return;
    }
    void loadGroups(address);
  }, [address, loadGroups]);

  const onNameChange = (next: string) => {
    if (!ASCII_REGEX.test(next)) {
      setNameError("Names must be ASCII only.");
      setName(next.slice(0, 64));
      return;
    }
    setNameError(null);
    setName(next.slice(0, 64));
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed || !address || pending) return;
    setPending(true);
    setCreateTxId(null);
    createGroup(
      trimmed,
      (txId) => {
        setPending(false);
        setCreateTxId(txId);
        setName("");
      },
      () => setPending(false),
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
          <span className="text-foreground font-medium">Groups</span>
          <Link href="/feed" className="text-foreground/60 hover:text-foreground">
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

      <h1 className="text-3xl mb-2">Groups</h1>
      <p className="text-foreground/70 mb-8">
        Create a named group and anchor documents under it with members you
        trust. Every member can add to a shared, on-chain document history.
      </p>

      {walletError && (
        <p className="mb-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {walletError}
        </p>
      )}

      {!address ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">
            Connect your Stacks wallet to create and manage groups.
          </p>
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-50"
          >
            {connecting ? "Opening wallet..." : "Connect wallet"}
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-foreground/10 bg-card p-6 mb-10">
            <h2 className="text-lg mb-3">Create a group</h2>
            <label
              htmlFor="group-name"
              className="block text-sm text-foreground/60 mb-2"
            >
              Group name (ASCII, up to 64 chars)
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. thesis-committee-2026"
              maxLength={64}
              disabled={pending}
              aria-invalid={nameError ? true : undefined}
              className="w-full px-3 py-2 rounded-md border border-foreground/15 bg-card focus:outline-none focus:border-foreground/50 disabled:opacity-60"
            />
            <div className="mt-1 flex items-center justify-between text-xs">
              <span
                className={nameError ? "text-red-600 dark:text-red-400" : "text-transparent"}
                role={nameError ? "alert" : undefined}
              >
                {nameError ?? "."}
              </span>
              <span className="text-foreground/50 font-mono">
                {name.length}/64
              </span>
            </div>
            <button
              onClick={submit}
              disabled={pending || !name.trim() || !!nameError}
              className="mt-4 px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              {pending ? "Awaiting wallet signature..." : "Create group"}
            </button>
            {createTxId && (
              <p className="mt-4 text-sm text-green-700 dark:text-green-400">
                Group creation submitted.{" "}
                <a
                  href={explorerTxUrl(createTxId)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:no-underline"
                >
                  View transaction
                </a>
                . It will appear below once confirmed on chain.{" "}
                <button
                  onClick={() => void loadGroups(address)}
                  className="underline hover:no-underline"
                >
                  Refresh
                </button>
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg">Your groups</h2>
            <button
              onClick={() => void loadGroups(address)}
              disabled={loading}
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadError ? (
            <p className="text-red-600 dark:text-red-400">{loadError}</p>
          ) : loading && groups.length === 0 ? (
            <p className="text-foreground/60">Loading groups...</p>
          ) : groups.length === 0 ? (
            <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
              <p className="text-foreground/70">
                You are not a member of any group yet. Create one above to get
                started.
              </p>
            </div>
          ) : (
            <div className="space-y-3" role="list">
              {groups.map((group) => (
                <div
                  key={group.id}
                  role="listitem"
                  className="rounded-lg border border-foreground/10 bg-card p-5 flex items-start justify-between gap-4 flex-wrap"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-medium truncate">
                      {group.name}
                    </div>
                    <div className="mt-1 text-sm text-foreground/60">
                      Group #{group.id} &middot; {group.anchorCount} anchor
                      {group.anchorCount === 1 ? "" : "s"}
                      {group.admin === address ? " · admin" : ""}
                    </div>
                  </div>
                  <Link
                    href={`/groups/${group.id}`}
                    className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition shrink-0"
                  >
                    Open &rarr;
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
