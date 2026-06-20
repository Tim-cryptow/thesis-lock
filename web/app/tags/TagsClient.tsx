"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";
import { useWallet } from "@/lib/wallet";
import { fetchAllAnchors } from "@/lib/fetchAllAnchors";
import {
  TAGS_CHANGED_EVENT,
  getAllTags,
  getHashesByTag,
  getRecentTags,
  getTagColor,
  getTagsForHash,
  type Tag,
} from "@/lib/tags";

function truncateHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

export default function TagsClient() {
  const { t } = useI18n();
  const { address } = useWallet();
  const [tags, setTags] = useState<Tag[]>([]);
  const [recent, setRecent] = useState<Tag[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [untagged, setUntagged] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => {
      setTags(getAllTags());
      setRecent(getRecentTags(8));
    };
    sync();
    window.addEventListener(TAGS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TAGS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Count the connected wallet's anchors that carry no tags, so the user can
  // jump straight to tagging them. Best-effort: any read failure just hides it.
  useEffect(() => {
    if (!address) {
      setUntagged(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const anchors = await fetchAllAnchors(address);
        if (cancelled) return;
        setUntagged(
          anchors.filter((a) => getTagsForHash(a.hash).length === 0).length,
        );
      } catch {
        if (!cancelled) setUntagged(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, tags]);

  const maxCount = useMemo(
    () => (tags.length ? Math.max(...tags.map((t) => t.count)) : 1),
    [tags],
  );

  const cloudSize = (count: number): string => {
    const min = 0.85;
    const max = 2.1;
    const ratio = maxCount > 1 ? (count - 1) / (maxCount - 1) : 0;
    return `${(min + ratio * (max - min)).toFixed(2)}rem`;
  };

  const topTags = tags.slice(0, 10);
  const activeHashes = activeTag ? getHashesByTag(activeTag) : [];

  return (
    <div className="flex-1 max-w-5xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.back")}
        </Link>
        <Link
          href="/anchors"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.myAnchors")}
        </Link>
        <Link
          href="/collections"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.collections")}
        </Link>
        <span className="text-foreground font-medium">Tags</span>
        <Link href="/docs" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.docs")}
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl mb-2">Tags</h1>
        <p className="text-foreground/70 max-w-2xl">
          Organize and explore your anchors by tag. Tags are stored only in this
          browser and shown across the verify, history, feed, and search pages.
        </p>
      </header>

      {tags.length === 0 ? (
        <div className="rounded-lg border border-foreground/10 bg-card p-8 text-center">
          <p className="text-foreground/70">No tags yet.</p>
          <p className="mt-1 text-sm text-foreground/50">
            Add tags to an anchor from its{" "}
            <Link href="/anchors" className="underline hover:text-foreground">
              history
            </Link>{" "}
            or verify page, then they will appear here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Tag cloud */}
          <section className="rounded-lg border border-foreground/10 bg-card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-foreground/50">
              Tag cloud
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {tags.map((tag) => {
                const active = tag.name === activeTag;
                const color = getTagColor(tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    onClick={() =>
                      setActiveTag(active ? null : tag.name)
                    }
                    style={{
                      fontSize: cloudSize(tag.count),
                      color,
                      textDecorationColor: color,
                    }}
                    className={`font-medium leading-none transition hover:opacity-80 ${
                      active ? "underline underline-offset-4" : ""
                    }`}
                  >
                    {tag.name}
                    <span className="ml-1 align-super text-[10px] text-foreground/40">
                      {tag.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeTag && (
              <div className="mt-6 border-t border-foreground/10 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Anchors tagged{" "}
                    <span style={{ color: getTagColor(activeTag) }}>
                      {activeTag}
                    </span>{" "}
                    ({activeHashes.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTag(null)}
                    className="text-xs text-foreground/60 hover:text-foreground"
                  >
                    Close
                  </button>
                </div>
                <ul className="space-y-1.5">
                  {activeHashes.map((hash) => (
                    <li key={hash}>
                      <Link
                        href={`/v/${hash}`}
                        className="font-mono text-xs text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {truncateHash(hash)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Statistics */}
          <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-foreground/10 bg-card p-6 md:col-span-2">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-foreground/50">
                Most used
              </h2>
              <div className="flex flex-col gap-2">
                {topTags.map((tag) => {
                  const color = getTagColor(tag.name);
                  const width = maxCount > 0 ? (tag.count / maxCount) * 100 : 0;
                  return (
                    <div key={tag.name} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTag(tag.name)}
                        className="w-28 shrink-0 truncate text-left text-xs hover:underline"
                        style={{ color }}
                        title={tag.name}
                      >
                        {tag.name}
                      </button>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-foreground/5">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(width, 4)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-foreground/50">
                        {tag.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-lg border border-foreground/10 bg-card p-6">
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground/50">
                  Recently added
                </h2>
                {recent.length === 0 ? (
                  <p className="text-xs text-foreground/40">n/a</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((tag) => {
                      const color = getTagColor(tag.name);
                      return (
                        <button
                          key={tag.name}
                          type="button"
                          onClick={() => setActiveTag(tag.name)}
                          className="rounded-full border px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${color}1f`,
                            color,
                            borderColor: `${color}55`,
                          }}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-foreground/10 bg-card p-6">
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground/50">
                  Untagged anchors
                </h2>
                {untagged === null ? (
                  <p className="text-xs text-foreground/40">
                    Connect a wallet to see your untagged anchors.
                  </p>
                ) : (
                  <div>
                    <p className="text-2xl font-semibold tabular-nums">
                      {untagged}
                    </p>
                    {untagged > 0 && (
                      <Link
                        href="/anchors"
                        className="mt-1 inline-block text-xs underline hover:text-foreground"
                      >
                        Tag them
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Management table */}
          <section className="rounded-lg border border-foreground/10 bg-card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-foreground/50">
              Manage tags
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground/10 text-left text-xs uppercase tracking-wide text-foreground/50">
                    <th className="py-2 pr-4 font-medium">Tag</th>
                    <th className="py-2 pr-4 font-medium">Count</th>
                    <th className="py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tags.map((tag) => {
                    const color = getTagColor(tag.name);
                    return (
                      <tr
                        key={tag.name}
                        className="border-b border-foreground/5 last:border-0"
                      >
                        <td className="py-2 pr-4">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden="true"
                            />
                            {tag.name}
                          </span>
                        </td>
                        <td className="py-2 pr-4 tabular-nums text-foreground/60">
                          {tag.count}
                        </td>
                        <td className="py-2">
                          <button
                            type="button"
                            onClick={() => setActiveTag(tag.name)}
                            className="text-xs text-foreground/60 hover:text-foreground"
                          >
                            View anchors
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
