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
  resolveColor,
} from "@/lib/collections";

export type SaveItem = { hash: string; label?: string; verifyUrl?: string };

// Saves several hashes to one collection at once. Used after a bulk verify or a
// report run: pick an existing collection or spin up a new one, and every item
// is added in a single pass. A sibling to AddToCollectionButton (which toggles a
// single hash across many collections); this fans one set into one collection.
export default function SaveToCollectionButton({
  items,
  triggerLabel,
  className = "",
}: {
  items: SaveItem[];
  triggerLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setCollections(loadCollections());
    sync();
    window.addEventListener(COLLECTIONS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COLLECTIONS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  const saveAll = useCallback(
    (collectionId: string, name: string) => {
      for (const item of items) {
        addToCollection(collectionId, item.hash, item.label ?? "", "", item.verifyUrl);
      }
      setSavedTo(name);
      setTimeout(() => setSavedTo(null), 2500);
      setOpen(false);
    },
    [items],
  );

  const create = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const collection = createCollection(name, "", DEFAULT_COLOR, DEFAULT_ICON!);
    setNewName("");
    setCreating(false);
    saveAll(collection.id, collection.name);
  }, [newName, saveAll]);

  const disabled = items.length === 0;

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`text-sm px-3 py-2 rounded-md border border-foreground/15 hover:border-foreground/40 transition disabled:opacity-50 ${className}`}
      >
        {savedTo ? `Saved to ${savedTo}` : triggerLabel}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-foreground/15 bg-card p-2 shadow-lg"
        >
          <p className="px-1 pb-2 text-xs text-foreground/55">
            Save {items.length} {items.length === 1 ? "item" : "items"} to:
          </p>
          <div className="max-h-56 overflow-y-auto">
            {collections.length === 0 ? (
              <p className="px-1 py-2 text-xs text-foreground/55">No collections yet.</p>
            ) : (
              collections.map((c) => {
                const color = resolveColor(c.color);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => saveAll(c.id, c.name)}
                    className="flex w-full items-center gap-2 rounded px-1 py-1.5 text-left text-sm hover:bg-foreground/5"
                  >
                    <span className={`text-base ${color.text}`}>{c.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="text-[10px] text-foreground/40">{c.items.length}</span>
                  </button>
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
                    Create and save
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
