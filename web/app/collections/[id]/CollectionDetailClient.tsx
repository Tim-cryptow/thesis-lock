"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import { useI18n } from "@/app/components/I18nProvider";
import { HEX_64 } from "@/lib/verify";
import { hashFile, getRecentAnchors, type RegistryEntry } from "@/lib/stacks";
import { truncateAddress, useWallet } from "@/lib/wallet";
import { downloadExport } from "@/lib/export";
import {
  type Collection,
  type CollectionItem,
  COLLECTIONS_CHANGED_EVENT,
  addToCollection,
  deleteCollection,
  encodeCollection,
  exportCollection,
  getCollection,
  normalizeHash,
  removeFromCollection,
  reorderItem,
  resolveColor,
  setItemNote,
  updateCollection,
} from "@/lib/collections";
import { ColorPicker, IconPicker } from "../CollectionsClient";

function truncateMiddle(value: string, lead = 8, tail = 6): string {
  if (value.length <= lead + tail + 1) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function ItemRow({
  item,
  index,
  total,
  onRemove,
  onNote,
  onReorder,
}: {
  item: CollectionItem;
  index: number;
  total: number;
  onRemove: (hash: string) => void;
  onNote: (hash: string, note: string) => void;
  onReorder: (hash: string, dir: "up" | "down") => void;
}) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState(item.note);
  const [editingNote, setEditingNote] = useState(false);

  useEffect(() => setNote(item.note), [item.note]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(item.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; ignore.
    }
  }, [item.hash]);

  const saveNote = useCallback(() => {
    onNote(item.hash, note.trim());
    setEditingNote(false);
  }, [item.hash, note, onNote]);

  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {item.label && (
            <div className="font-medium truncate">{item.label}</div>
          )}
          <div className="mt-1 flex items-center gap-2">
            <code className="font-mono text-xs text-foreground/65 break-all">
              {truncateMiddle(item.hash)}
            </code>
            <button
              type="button"
              onClick={() => void copy()}
              className="shrink-0 rounded border border-foreground/15 px-1.5 py-0.5 text-[10px] text-foreground/60 hover:text-foreground"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-[11px] text-foreground/45">
            {formatDate(item.addedAt)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onReorder(item.hash, "up")}
              disabled={index === 0}
              aria-label="Move up"
              className="rounded border border-foreground/15 px-1.5 text-foreground/60 hover:text-foreground disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => onReorder(item.hash, "down")}
              disabled={index === total - 1}
              aria-label="Move down"
              className="rounded border border-foreground/15 px-1.5 text-foreground/60 hover:text-foreground disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3">
        {editingNote ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={280}
              placeholder="Add a note"
              className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground/50"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveNote}
                className="rounded border border-foreground/20 px-2 py-1 text-xs hover:border-foreground/40"
              >
                Save note
              </button>
              <button
                type="button"
                onClick={() => {
                  setNote(item.note);
                  setEditingNote(false);
                }}
                className="rounded border border-foreground/20 px-2 py-1 text-xs hover:border-foreground/40"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className="text-left text-sm text-foreground/70 hover:text-foreground"
          >
            {item.note ? item.note : <span className="text-foreground/40">Add a note</span>}
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <Link
          href={`/v/${item.hash}`}
          className="text-foreground/70 underline hover:text-foreground"
        >
          Verify
        </Link>
        <button
          type="button"
          onClick={() => onRemove(item.hash)}
          className="ml-auto text-foreground/55 hover:text-red-500"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function CollectionDetailClient() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { address, connecting, connectWallet } = useWallet();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftColor, setDraftColor] = useState("");
  const [draftIcon, setDraftIcon] = useState("");

  const [hashInput, setHashInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [fileBusy, setFileBusy] = useState(false);

  const [recent, setRecent] = useState<RegistryEntry[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const refresh = useCallback(() => {
    setCollection(getCollection(id) ?? null);
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    refresh();
    const sync = () => refresh();
    window.addEventListener(COLLECTIONS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COLLECTIONS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [refresh]);

  const hashes = useMemo(
    () => (collection ? collection.items.map((i) => i.hash) : []),
    [collection],
  );

  const beginEdit = useCallback(() => {
    if (!collection) return;
    setDraftName(collection.name);
    setDraftDesc(collection.description);
    setDraftColor(collection.color);
    setDraftIcon(collection.icon);
    setEditing(true);
  }, [collection]);

  const saveEdit = useCallback(() => {
    if (!collection || !draftName.trim()) return;
    updateCollection(collection.id, {
      name: draftName.trim(),
      description: draftDesc.trim(),
      color: draftColor,
      icon: draftIcon,
    });
    setEditing(false);
  }, [collection, draftName, draftDesc, draftColor, draftIcon]);

  const onDelete = useCallback(() => {
    if (!collection) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete "${collection.name}"? This cannot be undone.`)
    ) {
      return;
    }
    deleteCollection(collection.id);
    router.push("/collections");
  }, [collection, router]);

  const addHash = useCallback(() => {
    if (!collection) return;
    const normalized = normalizeHash(hashInput);
    if (!HEX_64.test(normalized)) {
      setAddError("Enter a 64-character document hash.");
      return;
    }
    addToCollection(collection.id, normalized, "", noteInput);
    setHashInput("");
    setNoteInput("");
    setAddError(null);
  }, [collection, hashInput, noteInput]);

  const addFile = useCallback(
    async (file: File) => {
      if (!collection) return;
      setFileBusy(true);
      setAddError(null);
      try {
        const hash = await hashFile(file);
        addToCollection(collection.id, hash, file.name, "");
      } catch {
        setAddError("Could not hash that file.");
      } finally {
        setFileBusy(false);
      }
    },
    [collection],
  );

  const loadRecent = useCallback(async () => {
    if (!address) return;
    setRecentLoading(true);
    setRecentError(null);
    try {
      const entries = await getRecentAnchors(address);
      setRecent(entries.filter((e): e is RegistryEntry => e !== null));
    } catch {
      setRecentError("Could not load your anchors.");
    } finally {
      setRecentLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) void loadRecent();
  }, [address, loadRecent]);

  const exportJson = useCallback(() => {
    if (!collection) return;
    downloadExport(
      exportCollection(collection),
      `collection-${collection.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "export"}.json`,
      "application/json",
    );
  }, [collection]);

  const exportCsv = useCallback(() => {
    if (!collection) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const header = ["Hash", "Label", "Note", "Added", "Verify URL"];
    const rows = collection.items.map((i) =>
      [i.hash, i.label, i.note, i.addedAt, `${origin}/v/${i.hash}`]
        .map(escapeCsv)
        .join(","),
    );
    downloadExport(
      [header.join(","), ...rows].join("\r\n"),
      `collection-${collection.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "export"}.csv`,
      "text/csv",
    );
  }, [collection]);

  const share = useCallback(async () => {
    if (!collection) return;
    // Sharing implies the collection is public; mark it so and build a link
    // that carries the whole collection, base64-encoded, in the query string.
    if (!collection.isPublic) updateCollection(collection.id, { isPublic: true });
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/collections/shared?data=${encodeCollection({
      ...collection,
      isPublic: true,
    })}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable; the URL is still shown to copy manually.
    }
  }, [collection]);

  const verifyAll = useCallback(() => {
    if (hashes.length === 0) return;
    router.push(`/verify-bulk?hashes=${hashes.join(",")}`);
  }, [hashes, router]);

  const generateReport = useCallback(() => {
    if (hashes.length === 0) return;
    router.push(`/report?hashes=${hashes.join(",")}`);
  }, [hashes, router]);

  if (loaded && !collection) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <Link href="/collections" className="text-sm text-foreground/60 hover:text-foreground">
          ← Collections
        </Link>
        <p className="mt-8 text-foreground/70">
          This collection does not exist in this browser. It may have been
          deleted, or you opened it on a different device.
        </p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <p className="text-foreground/55">Loading...</p>
      </div>
    );
  }

  const color = resolveColor(collection.color);
  const count = collection.items.length;

  return (
    <div className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center gap-4 text-sm mb-8 flex-wrap">
        <div className="order-last ml-auto">
          <ThemeToggle />
        </div>
        <Link href="/" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.back")}
        </Link>
        <Link
          href="/collections"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.collections")}
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-foreground/10 bg-card mb-8">
        <div className={`h-1.5 ${color.bar}`} />
        <div className="p-5">
          {editing ? (
            <div className="flex flex-col gap-4">
              <input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                maxLength={64}
                className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground/50"
              />
              <textarea
                value={draftDesc}
                onChange={(e) => setDraftDesc(e.target.value)}
                rows={2}
                maxLength={280}
                placeholder="Description"
                className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground/50"
              />
              <div>
                <span className="mb-2 block text-xs text-foreground/55">Color</span>
                <ColorPicker value={draftColor} onChange={setDraftColor} />
              </div>
              <div>
                <span className="mb-2 block text-xs text-foreground/55">Icon</span>
                <IconPicker value={draftIcon} onChange={setDraftIcon} />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="rounded-md bg-heading px-4 py-2 text-sm text-background hover:opacity-90"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:border-foreground/40"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-2xl ${color.chip}`}
                >
                  {collection.icon}
                </span>
                <div className="min-w-0">
                  <h1 className="text-2xl truncate">{collection.name}</h1>
                  <div className="text-xs text-foreground/50">
                    {count} {count === 1 ? "item" : "items"}
                    {collection.isPublic && (
                      <span className={`ml-2 ${color.text}`}>Public</span>
                    )}
                  </div>
                </div>
              </div>
              {collection.description && (
                <p className="mt-3 text-sm text-foreground/70">
                  {collection.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <button
                  type="button"
                  onClick={beginEdit}
                  className="rounded-md border border-foreground/20 px-3 py-1.5 hover:border-foreground/40"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={exportJson}
                  className="rounded-md border border-foreground/20 px-3 py-1.5 hover:border-foreground/40"
                >
                  Export JSON
                </button>
                <button
                  type="button"
                  onClick={() => void share()}
                  className="rounded-md border border-foreground/20 px-3 py-1.5 hover:border-foreground/40"
                >
                  {shareCopied ? "Link copied" : "Share link"}
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-md border border-foreground/20 px-3 py-1.5 text-red-500 hover:border-red-500/50"
                >
                  Delete
                </button>
              </div>
              {shareUrl && (
                <p className="mt-3 break-all rounded-md bg-foreground/5 p-2 font-mono text-[11px] text-foreground/70">
                  {shareUrl}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {count > 0 && (
        <div className="mb-8 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={verifyAll}
            className="rounded-md bg-heading px-3 py-1.5 text-background hover:opacity-90"
          >
            Verify All
          </button>
          <button
            type="button"
            onClick={generateReport}
            className="rounded-md border border-foreground/20 px-3 py-1.5 hover:border-foreground/40"
          >
            Generate Report
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-md border border-foreground/20 px-3 py-1.5 hover:border-foreground/40"
          >
            Export CSV
          </button>
        </div>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-medium text-foreground/70 mb-3">
          Items <span className="text-foreground/40">({count})</span>
        </h2>
        {count === 0 ? (
          <p className="text-sm text-foreground/55">
            No items yet. Add a hash, drop a file, or pull from your anchors
            below.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {collection.items.map((item, index) => (
              <ItemRow
                key={item.hash}
                item={item}
                index={index}
                total={count}
                onRemove={(hash) => removeFromCollection(collection.id, hash)}
                onNote={(hash, note) => setItemNote(collection.id, hash, note)}
                onReorder={(hash, dir) => reorderItem(collection.id, hash, dir)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-sm font-medium mb-4">Add items</h2>

        <div className="mb-6">
          <span className="mb-2 block text-xs text-foreground/55">
            Add by hash
          </span>
          <div className="flex flex-col gap-2">
            <input
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              placeholder="64-character document hash"
              className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:border-foreground/50"
            />
            <input
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Note (optional)"
              maxLength={280}
              className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground/50"
            />
            {addError && <p className="text-sm text-red-500">{addError}</p>}
            <div>
              <button
                type="button"
                onClick={addHash}
                className="rounded-md bg-heading px-4 py-2 text-sm text-background hover:opacity-90"
              >
                Add hash
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <span className="mb-2 block text-xs text-foreground/55">
            Add by file
          </span>
          <label
            className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-foreground/20 px-4 py-6 text-sm text-foreground/60 hover:border-foreground/40"
          >
            <input
              type="file"
              className="hidden"
              disabled={fileBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void addFile(file);
                e.target.value = "";
              }}
            />
            {fileBusy ? "Hashing..." : "Drop a file here, or click to choose. It is hashed locally."}
          </label>
        </div>

        <div>
          <span className="mb-2 block text-xs text-foreground/55">
            Add from My Anchors
          </span>
          {!address ? (
            <button
              type="button"
              onClick={() => void connectWallet()}
              disabled={connecting}
              className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:border-foreground/40 disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect wallet"}
            </button>
          ) : recentLoading ? (
            <p className="text-sm text-foreground/55">Loading your anchors...</p>
          ) : recentError ? (
            <p className="text-sm text-red-500">{recentError}</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-foreground/55">
              No anchors found for {truncateAddress(address)}.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((entry) => {
                const inCollection = hashes.includes(entry.hash);
                return (
                  <div
                    key={entry.hash}
                    className="flex items-center justify-between gap-3 rounded-md border border-foreground/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <code className="font-mono text-xs text-foreground/65 break-all">
                        {truncateMiddle(entry.hash)}
                      </code>
                      {entry.label && (
                        <span className="ml-2 text-xs text-foreground/50">
                          {entry.label}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={inCollection}
                      onClick={() =>
                        addToCollection(collection.id, entry.hash, entry.label, "")
                      }
                      className="shrink-0 rounded border border-foreground/15 px-2 py-1 text-xs hover:border-foreground/40 disabled:opacity-40"
                    >
                      {inCollection ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
