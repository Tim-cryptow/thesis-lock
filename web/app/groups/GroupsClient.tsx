"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import CollectionsNavLink from "@/app/components/CollectionsNavLink";
import ThemeToggle from "@/app/components/ThemeToggle";
import StaggerList from "@/app/components/StaggerList";
import EmptyState from "@/app/components/EmptyState";
import ValidatedInput from "@/app/components/ValidatedInput";
import HelpLink from "@/app/components/HelpLink";
import { validateGroupName } from "@/lib/validators";
import { sanitizeLabel } from "@/lib/sanitize";
import EmptyStateIcon from "@/app/components/EmptyStateIcon";
import { SkeletonLine, SkeletonBlock } from "@/app/components/Skeleton";
import ErrorFallback from "@/app/components/ErrorFallback";
import HelpText from "@/app/components/HelpText";
import { useI18n } from "@/app/components/I18nProvider";
import { createGroup, explorerTxUrl } from "@/lib/stacks";
import { auditGroupAction } from "@/lib/auditEvents";
import { fetchMyGroups, type GroupSummary } from "@/lib/groups";
import { truncateAddress, useWallet } from "@/lib/wallet";

const ASCII_REGEX = /^[\x20-\x7E]*$/;

export default function GroupsPage() {
  const { t } = useI18n();
  const { address, connecting, error: walletError, connectWallet, disconnectWallet } = useWallet();

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [createTxId, setCreateTxId] = useState<string | null>(null);

  const loadGroups = useCallback(
    async (owner: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        setGroups(await fetchMyGroups(owner));
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : t("groups.list.loadError"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!address) {
      setGroups([]);
      return;
    }
    void loadGroups(address);
  }, [address, loadGroups]);

  const onNameChange = (next: string) => {
    if (!ASCII_REGEX.test(next)) {
      setNameError(t("groups.create.asciiError"));
      setName(next.slice(0, 64));
      return;
    }
    setNameError(null);
    setName(next.slice(0, 64));
  };

  const submit = () => {
    const trimmed = sanitizeLabel(name);
    if (!trimmed || !address || pending) return;
    setPending(true);
    setCreateTxId(null);
    createGroup(
      trimmed,
      (txId) => {
        setPending(false);
        setCreateTxId(txId);
        setName("");
        auditGroupAction("group_create", trimmed, { txId });
      },
      () => setPending(false),
    );
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <div className="order-last ml-auto">
            <ThemeToggle />
          </div>
          <Link href="/" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.back")}
          </Link>
          <Link href="/search" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.search")}
          </Link>
          <Link href="/anchor" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.anchor")}
          </Link>
          <Link href="/anchors" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.myAnchors")}
          </Link>
          <span className="text-foreground font-medium">{t("common.nav.groups")}</span>
          <Link href="/feed" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.feed")}
          </Link>
          <Link href="/stats" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.stats")}
          </Link>
          <Link href="/dashboard" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.dashboard")}
          </Link>
          <Link href="/activity" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.activity")}
          </Link>
          <Link href="/compare" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.compare")}
          </Link>
          <Link href="/explorer" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.explorer")}
          </Link>
          <WatchlistNavLink />
          <CollectionsNavLink />
        </div>
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

      <h1 className="text-3xl mb-2">
        {t("groups.list.title")}
        <HelpText term="Group" />
      </h1>
      <p className="text-foreground/70 mb-8">{t("groups.list.intro")}</p>

      {walletError && (
        <p className="mb-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {walletError}
        </p>
      )}

      {!address ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">{t("groups.list.connectPrompt")}</p>
          <button
            onClick={connectWallet}
            disabled={connecting}
            className="px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-50"
          >
            {connecting ? t("common.wallet.opening") : t("common.wallet.connect")}
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-foreground/10 bg-card p-6 mb-10">
            <h2 className="text-lg mb-3 flex items-center gap-2">
              {t("groups.create.heading")}
              <HelpLink topic="what-are-groups" label="Help: groups" />
            </h2>
            <ValidatedInput
              id="group-name"
              label={t("groups.create.nameLabel")}
              value={name}
              onChange={onNameChange}
              validator={validateGroupName}
              placeholder={t("groups.create.namePlaceholder")}
              maxLength={64}
              required
            />
            <button
              onClick={submit}
              disabled={pending || !name.trim() || !!nameError}
              className="mt-4 px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              {pending ? t("groups.create.awaitingSignature") : t("groups.create.submit")}
            </button>
            {createTxId && (
              <p className="mt-4 text-sm text-green-700 dark:text-green-400">
                {t("groups.create.submitted")}{" "}
                <a
                  href={explorerTxUrl(createTxId)}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:no-underline"
                >
                  {t("groups.viewTransaction")}
                </a>
                {t("groups.create.appearOnConfirm")}{" "}
                <button
                  onClick={() => void loadGroups(address)}
                  className="underline hover:no-underline"
                >
                  {t("groups.refresh")}
                </button>
              </p>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg">{t("groups.list.yourGroups")}</h2>
            <button
              onClick={() => void loadGroups(address)}
              disabled={loading}
              className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50"
            >
              {loading ? t("groups.loading") : t("groups.refresh")}
            </button>
          </div>

          {loadError ? (
            <ErrorFallback message={loadError} onRetry={() => void loadGroups(address)} />
          ) : loading && groups.length === 0 ? (
            <div className="space-y-3" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-foreground/10 bg-card p-5 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <SkeletonLine width="40%" height="1.1rem" />
                    <SkeletonLine width="60%" height="0.8rem" />
                  </div>
                  <SkeletonBlock width="4rem" height="2.25rem" />
                </div>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={<EmptyStateIcon name="people" />}
              title="No groups yet"
              description="Create a group to organize anchors with your team or project."
              actionLabel="Create a Group"
              onAction={() => document.getElementById("group-name")?.focus()}
            />
          ) : (
            <div className="space-y-3" role="list">
              <StaggerList>
                {groups.map((group) => (
                  <div
                    key={group.id}
                    role="listitem"
                    className="rounded-lg border border-foreground/10 bg-card p-5 flex items-start justify-between gap-4 flex-wrap"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-medium truncate">{group.name}</div>
                      <div className="mt-1 text-sm text-foreground/60">
                        {t("groups.list.cardMeta", {
                          id: group.id,
                          anchors:
                            group.anchorCount === 1
                              ? t("groups.anchorCountOne", { count: group.anchorCount })
                              : t("groups.anchorCountOther", { count: group.anchorCount }),
                        })}
                        {group.admin === address ? t("groups.list.adminSuffix") : ""}
                      </div>
                    </div>
                    <Link
                      href={`/groups/${group.id}`}
                      className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition shrink-0"
                    >
                      {t("groups.list.open")}
                    </Link>
                  </div>
                ))}
              </StaggerList>
            </div>
          )}
        </>
      )}
    </div>
  );
}
