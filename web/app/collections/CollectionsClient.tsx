"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import EmptyState from "@/app/components/EmptyState";
import ValidatedInput from "@/app/components/ValidatedInput";
import EmptyStateIcon from "@/app/components/EmptyStateIcon";
import { useI18n } from "@/app/components/I18nProvider";
import { auditCollectionCreate } from "@/lib/auditEvents";
import {
  type Collection,
  COLLECTION_COLORS,
  COLLECTION_ICONS,
  COLLECTIONS_CHANGED_EVENT,
  DEFAULT_COLOR,
  DEFAULT_ICON,
  createCollection,
  importCollection,
  loadCollections,
  resolveColor,
} from "@/lib/collections";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Reused by the creation form here and the inline editor on the detail page.
export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLLECTION_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          aria-label={c.name}
          aria-pressed={value === c.id}
          title={c.name}
          className={`h-7 w-7 rounded-full ${c.bar} transition ${
            value === c.id
              ? "ring-2 ring-offset-2 ring-offset-card ring-foreground"
              : "opacity-70 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (icon: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLLECTION_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          onClick={() => onChange(icon)}
          aria-label={`Icon ${icon}`}
          aria-pressed={value === icon}
          className={`flex h-9 w-9 items-center justify-center rounded-md border text-lg transition ${
            value === icon
              ? "border-foreground bg-foreground/5"
              : "border-foreground/15 hover:border-foreground/40"
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const color = resolveColor(collection.color);
  const count = collection.items.length;
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-foreground/10 bg-card transition hover:border-foreground/30"
    >
      <div className={`h-1.5 ${color.bar}`} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl ${color.chip}`}
          >
            {collection.icon}
          </span>
          <div className="min-w-0">
            <div className="truncate font-medium">{collection.name}</div>
            <div className="text-xs text-foreground/50">
              {count} {count === 1 ? "item" : "items"}
            </div>
          </div>
        </div>
        {collection.description && (
          <p className="mt-3 line-clamp-2 text-sm text-foreground/70">
            {collection.description}
          </p>
        )}
        <div className="mt-auto pt-4 text-xs text-foreground/45">
          Updated {relativeTime(collection.updatedAt)}
          {collection.isPublic && (
            <span className={`ml-2 ${color.text}`}>Public</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function CollectionsClient() {
  const { t } = useI18n();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCollections(loadCollections());
    const sync = () => setCollections(loadCollections());
    window.addEventListener(COLLECTIONS_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(COLLECTIONS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setColor(DEFAULT_COLOR);
    setIcon(DEFAULT_ICON);
    setError(null);
    setCreating(false);
  }, []);

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        setError("Give your collection a name.");
        return;
      }
      createCollection(name, description, color, icon);
      auditCollectionCreate(name.trim());
      setCollections(loadCollections());
      resetForm();
    },
    [name, description, color, icon, resetForm],
  );

  const runImport = useCallback((json: string) => {
    try {
      importCollection(json);
      setCollections(loadCollections());
      setImporting(false);
      setImportText("");
      setImportError(null);
    } catch {
      setImportError("That does not look like an exported collection.");
    }
  }, []);

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => runImport(String(reader.result ?? ""));
      reader.onerror = () => setImportError("Could not read that file.");
      reader.readAsText(file);
      e.target.value = "";
    },
    [runImport],
  );

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
        <Link href="/search" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.search")}
        </Link>
        <Link
          href="/watchlist"
          className="text-foreground/60 hover:text-foreground"
        >
          {t("common.nav.watchlist")}
        </Link>
        <span className="text-foreground font-medium">
          {t("common.nav.collections")}
        </span>
        <Link href="/tags" className="text-foreground/60 hover:text-foreground">
          Tags
        </Link>
        <Link href="/docs" className="text-foreground/60 hover:text-foreground">
          {t("common.nav.docs")}
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <h1 className="text-3xl">Collections</h1>
        <button
          type="button"
          onClick={() => {
            setImporting((v) => !v);
            setImportError(null);
          }}
          className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm hover:border-foreground/40"
        >
          Import collection
        </button>
      </div>
      <p className="text-foreground/70 mb-8 max-w-2xl">
        Group anchored documents into named collections, like playlists for your
        proofs. Collections live only in this browser and are separate from
        on-chain groups. Share one with a link or export it as JSON.
      </p>

      {importing && (
        <div className="rounded-lg border border-foreground/10 bg-card p-5 mb-8">
          <h2 className="text-sm font-medium mb-3">Import a collection</h2>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste exported collection JSON here"
            rows={5}
            className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 font-mono text-xs focus:outline-none focus:border-foreground/50"
          />
          {importError && (
            <p className="mt-2 text-sm text-red-500">{importError}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => runImport(importText)}
              disabled={!importText.trim()}
              className="rounded-md bg-heading px-4 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"
            >
              Import from JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:border-foreground/40"
            >
              Upload .json file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="hidden"
            />
          </div>
        </div>
      )}

      {creating && (
        <form
          onSubmit={submit}
          className="rounded-lg border border-foreground/10 bg-card p-5 mb-8"
        >
          <h2 className="text-sm font-medium mb-4">New collection</h2>
          <div className="flex flex-col gap-4">
            <ValidatedInput
              label="Collection name"
              value={name}
              onChange={setName}
              placeholder="Collection name"
              maxLength={64}
              required
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              maxLength={280}
              className="w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm focus:outline-none focus:border-foreground/50"
            />
            <div>
              <span className="mb-2 block text-xs text-foreground/55">Color</span>
              <ColorPicker value={color} onChange={setColor} />
            </div>
            <div>
              <span className="mb-2 block text-xs text-foreground/55">Icon</span>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-md bg-heading px-4 py-2 text-sm text-background hover:opacity-90"
              >
                Create
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-foreground/20 px-4 py-2 text-sm hover:border-foreground/40"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {collections.length === 0 && !creating ? (
        <EmptyState
          icon={<EmptyStateIcon name="collections" />}
          title="No collections yet"
          description="Create a collection to organize your documents."
          actionLabel="Create a Collection"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map((c) => (
            <CollectionCard key={c.id} collection={c} />
          ))}
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex min-h-[8rem] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-foreground/20 bg-card p-5 text-foreground/55 transition hover:border-foreground/40 hover:text-foreground"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-sm">New Collection</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
