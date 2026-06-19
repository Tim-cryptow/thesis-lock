"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Collection,
  COLLECTIONS_CHANGED_EVENT,
  DEFAULT_COLOR,
  DEFAULT_ICON,
  addToCollection,
  createCollection,
  loadCollections,
  removeFromCollection,
  resolveColor,
} from "@/lib/collections";

// A compact dropdown for adding a hash to one or more collections. Reusable
// inline next to hashes across the app. The trigger shows a folder icon and
// fills in when the hash is already in at least one collection. Opening it lists
// every collection with a checkbox (checked = contains this hash), an optional
// note that applies to adds, and a "New collection" row at the bottom.
export default function AddToCollectionButton({
  hash,
  label = "",
  showLabel = false,
  className = "",
}: {
  hash: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const sync = useCallback(() => setCollections(loadCollections()), []);

  useEffect(() => {
    sync();
    window.addEventListener(COLLECTIONS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COLLECTIONS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  // Close on outside click or Escape while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const containingCount = collections.filter((c) =>
    c.items.some((i) => i.hash === hash.toLowerCase().replace(/^0x/, "")),
  ).length;
  const active = containingCount > 0;

  const toggle = useCallback(
    (collection: Collection, checked: boolean) => {
      if (checked) addToCollection(collection.id, hash, label, note);
      else removeFromCollection(collection.id, hash);
    },
    [hash, label, note],
  );

  const create = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const collection = createCollection(name, "", DEFAULT_COLOR, DEFAULT_ICON);
    addToCollection(collection.id, hash, label, note);
    setNewName("");
    setCreating(false);
  }, [newName, hash, label, note]);

  const normalized = hash.toLowerCase().replace(/^0x/, "");

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Add to collection"
        title={
          active
            ? `In ${containingCount} ${containingCount === 1 ? "collection" : "collections"}`
            : "Add to collection"
        }
        className={`inline-flex items-center gap-1.5 rounded border border-foreground/15 px-2 py-1 text-xs transition hover:border-foreground/40 ${
          active ? "text-heading" : "text-foreground/60"
        } ${className}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 5a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        </svg>
        {showLabel && <span>{active ? "In collections" : "Collect"}</span>}
        {active && !showLabel && (
          <span className="text-[10px]">{containingCount}</span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-foreground/15 bg-card p-2 shadow-lg"
        >
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            maxLength={280}
            className="mb-2 w-full rounded border border-foreground/15 bg-background px-2 py-1 text-xs focus:outline-none focus:border-foreground/50"
          />
          <div className="max-h-56 overflow-y-auto">
            {collections.length === 0 ? (
              <p className="px-1 py-2 text-xs text-foreground/55">
                No collections yet.
              </p>
            ) : (
              collections.map((c) => {
                const checked = c.items.some((i) => i.hash === normalized);
                const color = resolveColor(c.color);
                return (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-foreground/5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggle(c, e.target.checked)}
                      className="accent-current"
                    />
                    <span className={`text-base ${color.text}`}>{c.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="text-[10px] text-foreground/40">
                      {c.items.length}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="mt-2 border-t border-foreground/10 pt-2">
            {creating ? (
              <div className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") create();
                  }}
                  placeholder="New collection name"
                  maxLength={64}
                  className="w-full rounded border border-foreground/15 bg-background px-2 py-1 text-xs focus:outline-none focus:border-foreground/50"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={create}
                    className="rounded bg-heading px-2 py-1 text-xs text-background hover:opacity-90"
                  >
                    Create and add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setNewName("");
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
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              >
                <span className="text-base leading-none">+</span>
                New collection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
