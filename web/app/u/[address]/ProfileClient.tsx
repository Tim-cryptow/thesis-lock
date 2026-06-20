"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import WatchlistButton from "@/app/components/WatchlistButton";
import { useI18n } from "@/app/components/I18nProvider";
import { truncateAddress, useWallet } from "@/lib/wallet";
import { explorerAddressUrl } from "@/lib/stacks";
import { instrumentedFetch } from "@/lib/fetchInstrumented";
import { getTemplate, parseLabel } from "@/lib/templates";
import type { WalletProfile } from "@/lib/profile";

const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

type Status = "loading" | "ready" | "error";

// A copy-to-clipboard control that flips to a confirmation label for a moment.
// Profiles are public, so this stays a tiny self-contained helper rather than a
// shared component pulling in wallet state.
function CopyButton({ value, label }: { value: string; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); leave the label as-is.
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className="text-xs px-2 py-1 rounded border border-foreground/15 hover:border-foreground/40 transition"
      aria-label={label}
    >
      {copied ? t("common.actions.copied") : t("common.actions.copy")}
    </button>
  );
}

// Renders an anchor label as either its structured template fields or, for a
// free-form label, the raw text. Mirrors the verify page's label display.
function AnchorLabel({ label }: { label: string }) {
  const parsed = parseLabel(label);
  const template = parsed.templateId ? getTemplate(parsed.templateId) : undefined;

  if (!template) {
    return (
      <code className="font-mono text-xs break-all">{label || "(no label)"}</code>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-foreground/60 border border-foreground/15 rounded px-1.5 py-0.5">
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 items-center justify-center rounded bg-heading text-background text-[9px] font-semibold"
      >
        {template.icon}
      </span>
      {template.name}
    </span>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-5">
      <div className="text-2xl md:text-3xl font-mono">{value}</div>
      <div className="text-xs text-foreground/60 uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}

export default function ProfileClient() {
  const params = useParams<{ address: string }>();
  const raw = params.address ?? "";
  const address = useMemo(() => raw.toUpperCase(), [raw]);
  const valid = useMemo(() => STX_PRINCIPAL.test(address), [address]);

  const { t } = useI18n();
  const { address: connected } = useWallet();
  const isSelf = connected != null && connected.toUpperCase() === address;

  const [status, setStatus] = useState<Status>("loading");
  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!valid) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setProfile(null);

    (async () => {
      try {
        const res = await instrumentedFetch(`/api/profile/${address}`);
        if (!res.ok) throw new Error(`profile fetch failed: ${res.status}`);
        const data = (await res.json()) as WalletProfile;
        if (cancelled) return;
        setProfile(data);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [address, valid]);

  const profileUrl = origin ? `${origin}/u/${address}` : `/u/${address}`;
  const badgeMarkdown = origin
    ? `![ThesisLock Profile](${origin}/api/profile-badge/${address})`
    : `![ThesisLock Profile](/api/profile-badge/${address})`;

  return (
    <main className="max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm flex-wrap mb-10">
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.back")}
        </Link>
        <Link href="/feed" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.feed")}
        </Link>
        <Link href="/anchor" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.anchor")}
        </Link>
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
      </div>

      {!valid ? (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-8 text-center">
          <h1 className="text-2xl mb-2">Invalid address</h1>
          <p className="text-sm text-red-700 dark:text-red-400">
            This is not a valid Stacks principal. A profile address must be a
            standard wallet principal (SP or SM on mainnet, ST or SN on testnet).
          </p>
        </div>
      ) : status === "error" ? (
        <div className="rounded-lg border border-foreground/10 bg-card px-4 py-8 text-center">
          <h1 className="text-2xl mb-2">Profile unavailable</h1>
          <p className="text-sm text-foreground/70">
            Could not load this profile right now. Please try again.
          </p>
        </div>
      ) : status === "loading" || !profile ? (
        <div className="space-y-6" aria-busy="true">
          <div className="h-8 w-2/3 rounded bg-foreground/10 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-lg bg-foreground/10 animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="mb-10">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h1 className="text-2xl md:text-3xl">Wallet profile</h1>
              {isSelf && (
                <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-heading text-background">
                  This is you
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="font-mono text-xs md:text-sm break-all text-foreground/80">
                {profile.address}
              </code>
              <CopyButton value={profile.address} label="Copy address" />
              <WatchlistButton
                type="wallet"
                value={profile.address}
                showLabel
              />
              <a
                href={explorerAddressUrl(profile.address)}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-2 py-1 rounded border border-foreground/15 hover:border-foreground/40 transition"
              >
                Explorer
              </a>
            </div>
            {(profile.firstSeen > 0 || profile.lastSeen > 0) && (
              <p className="text-xs text-foreground/60 mt-3">
                {profile.firstSeen > 0 && (
                  <>Active since block {profile.firstSeen}</>
                )}
                {profile.firstSeen > 0 && profile.lastSeen > 0 && (
                  <span className="mx-2 text-foreground/30">&middot;</span>
                )}
                {profile.lastSeen > 0 && (
                  <>Last active block {profile.lastSeen}</>
                )}
              </p>
            )}
          </header>

          {/* Stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <Stat value={profile.totalAnchors} label="Anchors" />
            <Stat value={profile.totalBatches} label="Batches" />
            <Stat value={profile.groupsCreated} label="Groups created" />
            <Stat value={profile.proofNFTs} label="Proof NFTs" />
          </section>

          {/* Document types */}
          {profile.topLabels.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm uppercase tracking-wide text-foreground/60 mb-3">
                Document types
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.topLabels.map((type) => (
                  <span
                    key={type}
                    className="text-xs px-2.5 py-1 rounded-full border border-foreground/15 text-foreground/80"
                  >
                    {getTemplate(type)?.name ?? type}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Recent anchors */}
          <section className="mb-10">
            <h2 className="text-sm uppercase tracking-wide text-foreground/60 mb-3">
              Recent anchors
            </h2>
            {profile.recentAnchors.length === 0 ? (
              <p className="text-sm text-foreground/60">
                No anchors recorded for this wallet yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {profile.recentAnchors.map((entry, idx) => (
                  <li
                    key={`${entry.hash}-${idx}`}
                    className="rounded-lg border border-foreground/10 bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <code className="font-mono text-xs break-all text-foreground/80">
                        {truncateAddress(entry.hash, 10, 10)}
                      </code>
                      <Link
                        href={
                          entry.source === "batch"
                            ? `/v/${entry.hash}?owner=${encodeURIComponent(profile.address)}`
                            : `/v/${entry.hash}`
                        }
                        className="text-xs underline hover:no-underline shrink-0"
                      >
                        Verify
                      </Link>
                    </div>
                    <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-foreground/60">
                      <AnchorLabel label={entry.label} />
                      <span>Block {entry.anchoredAt}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Share */}
          <section className="rounded-lg border border-foreground/10 bg-card p-5">
            <h2 className="text-sm uppercase tracking-wide text-foreground/60 mb-3">
              Share this profile
            </h2>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <code className="font-mono text-xs break-all text-foreground/80">
                {profileUrl}
              </code>
              <CopyButton value={profileUrl} label="Copy profile URL" />
            </div>
            <div>
              <p className="text-xs text-foreground/60 mb-2">
                Embeddable badge (Markdown)
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="font-mono text-xs break-all text-foreground/80">
                  {badgeMarkdown}
                </code>
                <CopyButton value={badgeMarkdown} label="Copy badge markdown" />
              </div>
              {origin && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${origin}/api/profile-badge/${address}`}
                  alt="ThesisLock profile badge preview"
                  className="mt-3 h-5"
                />
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
