"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";
import { useWallet } from "@/lib/wallet";
import { fetchAllAnchors } from "@/lib/fetchAllAnchors";
import { knownVerifyHrefs } from "@/lib/collections";
import {
  TAGS_CHANGED_EVENT,
  deleteTag,
  getAllTags,
  getHashesByTag,
  getRecentTags,
  getTagColor,
  getTagContexts,
  getTagsForHash,
  mergeTags,
  renameTag,
  setTagColor,
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
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [mergeFrom, setMergeFrom] = useState("");
  const [mergeInto, setMergeInto] = useState("");

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
  // Prefer a pinned verify path (batch owner or group row) for the tagged hash:
  // first the one recorded when the tag was added, then one from a collection
  // item, so a tagged batch or group anchor resolves to the right record.
  const activeTagContexts = getTagContexts(activeHashes);
  const activeCollectionHrefs = knownVerifyHrefs(activeHashes);

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
                        href={
                          activeTagContexts.get(hash) ??
                          activeCollectionHrefs.get(hash) ??
                          `/v/${hash}`
                        }
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

          {/* Management */}
          <section className="rounded-lg border border-foreground/10 bg-card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-foreground/50">
              Manage tags
            </h2>

            {tags.length >= 2 && (
              <div className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-foreground/10 p-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-foreground/50">Merge</label>
                  <select
                    value={mergeFrom}
                    onChange={(e) => setMergeFrom(e.target.value)}
                    aria-label="Tag to merge"
                    className="rounded-md border border-foreground/15 bg-background px-2 py-1 text-sm"
                  >
                    <option value="">Select tag</option>
                    {tags.map((tag) => (
                      <option key={tag.name} value={tag.name}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
                <span className="pb-1.5 text-xs text-foreground/50">into</span>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-foreground/50">Target</label>
                  <select
                    value={mergeInto}
                    onChange={(e) => setMergeInto(e.target.value)}
                    aria-label="Target tag"
                    className="rounded-md border border-foreground/15 bg-background px-2 py-1 text-sm"
                  >
                    <option value="">Select tag</option>
                    {tags.map((tag) => (
                      <option key={tag.name} value={tag.name}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!mergeFrom || !mergeInto || mergeFrom === mergeInto}
                  onClick={() => {
                    mergeTags(mergeFrom, mergeInto);
                    setMergeFrom("");
                    setMergeInto("");
                  }}
                  className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm hover:border-foreground/40 disabled:opacity-40"
                >
                  Merge
                </button>
              </div>
            )}

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
                    const editing = editingTag === tag.name;
                    return (
                      <tr
                        key={tag.name}
                        className="border-b border-foreground/5 last:border-0"
                      >
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={color}
                              onChange={(e) =>
                                setTagColor(tag.name, e.target.value)
                              }
                              aria-label={`Color for ${tag.name}`}
                              className="h-5 w-5 cursor-pointer rounded border border-foreground/15 bg-transparent p-0"
                            />
                            {editing ? (
                              <input
                                type="text"
                                value={draftName}
                                autoFocus
                                onChange={(e) => setDraftName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    renameTag(tag.name, draftName);
                                    setEditingTag(null);
                                  } else if (e.key === "Escape") {
                                    setEditingTag(null);
                                  }
                                }}
                                className="rounded-md border border-foreground/15 bg-background px-2 py-0.5 text-sm"
                              />
                            ) : (
                              <span>{tag.name}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 pr-4 tabular-nums text-foreground/60">
                          {tag.count}
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {editing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    renameTag(tag.name, draftName);
                                    setEditingTag(null);
                                  }}
                                  className="text-foreground/70 hover:text-foreground"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTag(null)}
                                  className="text-foreground/50 hover:text-foreground"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTag(tag.name);
                                  setDraftName(tag.name);
                                }}
                                className="text-foreground/60 hover:text-foreground"
                              >
                                Rename
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveTag(tag.name)}
                              className="text-foreground/60 hover:text-foreground"
                            >
                              View
                            </button>
                            {confirmDelete === tag.name ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="text-foreground/60">
                                  Delete?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    deleteTag(tag.name);
                                    setConfirmDelete(null);
                                  }}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(null)}
                                  className="text-foreground/50 hover:text-foreground"
                                >
                                  No
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(tag.name)}
                                className="text-foreground/55 hover:text-red-500"
                              >
                                Delete
                              </button>
                            )}
                          </div>
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
