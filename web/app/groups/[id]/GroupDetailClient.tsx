"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import WatchlistNavLink from "@/app/components/WatchlistNavLink";
import CollectionsNavLink from "@/app/components/CollectionsNavLink";
import ThemeToggle from "@/app/components/ThemeToggle";
import EmptyState from "@/app/components/EmptyState";
import EmptyStateIcon from "@/app/components/EmptyStateIcon";
import Breadcrumbs from "@/app/components/Breadcrumbs";
import BackButton from "@/app/components/BackButton";
import { SkeletonLine } from "@/app/components/Skeleton";
import WatchlistButton from "@/app/components/WatchlistButton";
import StarButton from "@/app/components/StarButton";
import ShareButtons from "@/app/components/ShareButtons";
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
import { addNotification } from "@/lib/notifications";
import { stageReportInput } from "@/lib/reportLink";
import { formatBytes } from "@/lib/format";
import { truncateAddress, useWallet } from "@/lib/wallet";
import TruncatedHash from "@/app/components/TruncatedHash";
import TruncatedAddress from "@/app/components/TruncatedAddress";
import { dispatchAudit } from "@/lib/auditEvents";
import FileDropZone from "@/app/components/FileDropZone";
import { useI18n } from "@/app/components/I18nProvider";
import { useConfirm } from "@/app/components/useConfirm";
import AddressInput from "@/app/components/AddressInput";

const ASCII_REGEX = /^[\x20-\x7E]*$/;
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

export default function GroupDetailPage() {
  const { t } = useI18n();
  const confirm = useConfirm();
  const params = useParams<{ id: string }>();
  const groupId = Number(params.id);
  const validId = Number.isInteger(groupId) && groupId > 0;

  const { address, connecting, error: walletError, connectWallet, disconnectWallet } = useWallet();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [anchorCount, setAnchorCount] = useState(0);
  const [anchors, setAnchors] = useState<GroupAnchor[]>([]);
  const [member, setMemberState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const isAdmin = !!address && !!group && group.admin === address;

  const load = useCallback(async () => {
    if (!validId) {
      setLoading(false);
      setLoadError(t("groups.detail.invalidId"));
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
      setLoadError(e instanceof Error ? e.message : t("groups.detail.loadError"));
    } finally {
      setLoading(false);
    }
  }, [groupId, validId, t]);

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
      setMemberError(t("groups.detail.invalidPrincipal"));
      return;
    }
    setMemberError(null);
    setAddPending(true);
    addMember(
      groupId,
      value,
      (txId) => {
        setAddPending(false);
        setNewMember("");
        addNotification({
          type: "group_invite",
          title: "Adding group member",
          message: `You submitted a transaction to add ${truncateAddress(value)} to this group; it takes effect once confirmed.`,
          icon: "group",
          priority: "low",
          actionUrl: `/groups/${groupId}`,
          actionLabel: "View group",
        });
        dispatchAudit("member_add", "group", value, { groupId, txId });
      },
      () => setAddPending(false),
    );
  };

  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const submitRemoveMember = async (principal: string) => {
    const ok = await confirm({
      title: "Remove member",
      message: `Remove ${truncateAddress(principal)} from this group?`,
      confirmLabel: "Remove",
      variant: "warning",
    });
    if (!ok) return;
    setRemovingMember(principal);
    removeMember(
      groupId,
      principal,
      (txId) => {
        setRemovingMember(null);
        dispatchAudit("member_remove", "group", principal, { groupId, txId });
      },
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

  const onFileSelect = useCallback(
    async (selected: File | null) => {
      if (!selected) return;
      setFile(selected);
      setHash(null);
      setHashError(null);
      setAnchorTxId(null);
      setHashing(true);
      try {
        setHash(await hashFile(selected));
      } catch (e) {
        setHashError(e instanceof Error ? e.message : t("groups.detail.hashError"));
      } finally {
        setHashing(false);
      }
    },
    [t],
  );

  const onLabelChange = (next: string) => {
    if (!ASCII_REGEX.test(next)) {
      setLabelError(t("groups.detail.labelAsciiError"));
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
        dispatchAudit("group_anchor", "group", hash, { groupId, txId });
      },
      () => setAnchorPending(false),
    );
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
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
          <Link href="/groups" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.groups")}
          </Link>
          <Link href="/anchors" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.myAnchors")}
          </Link>
          <Link href="/feed" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.feed")}
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
          <Link href="/report" className="text-foreground/60 hover:text-foreground">
            {t("common.nav.report")}
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
            <TruncatedAddress address={address} linkToProfile={false} copyable={false} />
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

      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <Breadcrumbs overrides={group ? { [params.id]: group.name } : undefined} />
        <BackButton />
      </div>

      {walletError && (
        <p className="mb-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {walletError}
        </p>
      )}

      {loading ? (
        <div className="space-y-6" aria-busy="true">
          <SkeletonLine width="14rem" height="1.75rem" />
          <SkeletonLine width="20rem" height="0.85rem" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border border-foreground/10 bg-card p-5 space-y-2.5"
              >
                <SkeletonLine width="60%" height="0.9rem" />
                <SkeletonLine width="40%" height="0.8rem" />
              </div>
            ))}
          </div>
        </div>
      ) : loadError ? (
        <p className="text-red-600 dark:text-red-400">{loadError}</p>
      ) : !group ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-10 text-center">
          <p className="text-foreground/70 mb-6">
            {t("groups.detail.notFound", { id: params.id })}
          </p>
          <Link
            href="/groups"
            className="inline-flex items-center px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 transition"
          >
            {t("groups.detail.backToGroups")}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl">{group.name}</h1>
            <WatchlistButton type="group" value={String(groupId)} label={group.name} showLabel />
            <StarButton type="group" value={String(groupId)} label={group.name} />
          </div>
          <div className="text-sm text-foreground/60 mb-8">
            {t("groups.detail.metaPrefix", { id: groupId })}{" "}
            <TruncatedAddress address={group.admin} copyable={false} /> &middot;{" "}
            {members.length === 1
              ? t("groups.memberCountOne", { count: members.length })
              : t("groups.memberCountOther", { count: members.length })}{" "}
            &middot;{" "}
            {anchorCount === 1
              ? t("groups.anchorCountOne", { count: anchorCount })
              : t("groups.anchorCountOther", { count: anchorCount })}
          </div>

          <div className="mb-8">
            <ShareButtons
              url={origin ? `${origin}/groups/${groupId}` : ""}
              title="Anchor group on ThesisLock"
            />
          </div>

          {isAdmin && (
            <div className="rounded-lg border border-foreground/10 bg-card p-6 mb-8">
              <h2 className="text-lg mb-3">{t("groups.detail.membersHeading")}</h2>
              <AddressInput
                id="new-member"
                label={t("groups.detail.addMemberLabel")}
                value={newMember}
                onChange={setNewMember}
              />
              <button
                onClick={submitAddMember}
                disabled={addPending || !newMember.trim()}
                className="mt-2 text-sm px-4 py-2 rounded-md bg-heading text-background hover:opacity-90 disabled:opacity-40 transition"
              >
                {addPending ? t("groups.detail.signing") : t("groups.detail.add")}
              </button>
              {memberError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
                  {memberError}
                </p>
              )}
              <p className="mt-2 text-xs text-foreground/50">{t("groups.detail.refreshHint")}</p>

              <ul className="mt-4 space-y-2" role="list">
                {members.map((m) => (
                  <li
                    key={m}
                    className="flex items-center justify-between gap-3 text-sm border-t border-foreground/10 pt-2"
                  >
                    <span className="inline-flex items-center gap-1 min-w-0">
                      <TruncatedAddress address={m} copyable={false} />
                      {m === group.admin ? (
                        <span className="text-foreground/50">{t("groups.detail.adminSuffix")}</span>
                      ) : null}
                    </span>
                    {m !== group.admin && (
                      <button
                        onClick={() => submitRemoveMember(m)}
                        disabled={removingMember === m}
                        className="text-xs px-2 py-1 rounded border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50 shrink-0"
                      >
                        {removingMember === m
                          ? t("groups.detail.signing")
                          : t("groups.detail.remove")}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-foreground/10 bg-card p-6 mb-8">
            <h2 className="text-lg mb-1">{t("groups.detail.anchorHeading")}</h2>
            <p className="text-foreground/70 text-sm mb-4">{t("groups.detail.anchorIntro")}</p>
            {!member ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {t("groups.detail.notMember")}
              </p>
            ) : (
              <>
                <FileDropZone
                  onFile={(f) => void onFileSelect(f)}
                  disabled={anchorPending}
                  ariaLabel={t("groups.detail.dropZoneAria")}
                >
                  {file ? (
                    <p className="text-foreground/80">
                      <span className="font-medium">{file.name}</span>{" "}
                      <span className="text-foreground/50 text-sm">({formatBytes(file.size)})</span>
                    </p>
                  ) : (
                    <p className="text-foreground/60">{t("groups.detail.dropZoneLabel")}</p>
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
                        {t("groups.detail.hashing")}
                      </p>
                    ) : (
                      <code className="font-mono text-xs break-all bg-foreground/5 px-3 py-2 rounded block">
                        {hash}
                      </code>
                    )}
                  </div>
                )}

                <div className="mt-4">
                  <label htmlFor="anchor-label" className="block text-sm text-foreground/60 mb-2">
                    {t("groups.detail.labelLabel")}
                  </label>
                  <input
                    id="anchor-label"
                    value={label}
                    onChange={(e) => onLabelChange(e.target.value)}
                    placeholder={t("groups.detail.labelPlaceholder")}
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
                    <span className="text-foreground/50 font-mono">{label.length}/64</span>
                  </div>
                </div>

                <button
                  onClick={submitAnchor}
                  disabled={!hash || hashing || anchorPending || !!labelError}
                  className="mt-4 px-6 py-3 rounded-md bg-heading text-background font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  {anchorPending
                    ? t("groups.detail.awaitingSignature")
                    : t("groups.detail.anchorSubmit")}
                </button>

                {anchorTxId && (
                  <p className="mt-4 text-sm text-green-700 dark:text-green-400">
                    {t("groups.detail.anchorSubmitted")}{" "}
                    <a
                      href={explorerTxUrl(anchorTxId)}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:no-underline"
                    >
                      {t("groups.viewTransaction")}
                    </a>
                    {t("groups.detail.appearOnConfirm")}{" "}
                    <button onClick={() => void load()} className="underline hover:no-underline">
                      {t("groups.refresh")}
                    </button>
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <h2 className="text-lg">{t("groups.detail.recentHeading")}</h2>
            <div className="flex gap-2">
              {anchors.length > 0 && (
                <Link
                  href="/report"
                  onClick={() => stageReportInput(anchors.map((a) => ({ hash: a.hash })))}
                  className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
                >
                  {t("groups.detail.generateReport")}
                </Link>
              )}
              <button
                onClick={() => void load()}
                className="text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition"
              >
                {t("groups.refresh")}
              </button>
            </div>
          </div>
          <p className="text-foreground/60 text-sm mb-4">{t("groups.detail.recentIntro")}</p>

          {anchors.length === 0 ? (
            <EmptyState
              icon={<EmptyStateIcon name="folder" />}
              title="No documents anchored in this group"
              description="Drop a file above to anchor it to this group."
            />
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
                        {t("groups.detail.hashFieldLabel")}
                      </div>
                      <TruncatedHash hash={anchor.hash} />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        {t("groups.detail.labelFieldLabel")}
                      </div>
                      <code className="font-mono text-xs">
                        {anchor.label || t("groups.detail.labelNone")}
                      </code>
                    </div>
                    <div>
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        {t("groups.detail.anchoredByLabel")}
                      </div>
                      <TruncatedAddress address={anchor.anchoredBy} copyable={false} />
                    </div>
                    <div>
                      <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                        {t("groups.detail.stacksBlockLabel")}
                      </div>
                      <code className="font-mono text-xs">{anchor.stacksBlock}</code>
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
