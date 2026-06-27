"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/app/components/ThemeToggle";
import Breadcrumbs from "@/app/components/Breadcrumbs";
import EmptyState from "@/app/components/EmptyState";
import StarButton from "@/app/components/StarButton";
import {
  FAVORITES_CHANGED_EVENT,
  type Favorite,
  type FavoriteType,
  favoriteHref,
  loadFavorites,
  removeFavorite,
} from "@/lib/favorites";

type SortMode = "type" | "recent";

const TYPE_ORDER: FavoriteType[] = ["hash", "wallet", "group", "page"];

const TYPE_META: Record<FavoriteType, { label: string; plural: string; badge: string }> = {
  hash: {
    label: "Hash",
    plural: "Hashes",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  wallet: {
    label: "Wallet",
    plural: "Wallets",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  group: {
    label: "Group",
    plural: "Groups",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  page: {
    label: "Page",
    plural: "Pages",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function truncateValue(value: string): string {
  if (value.length <= 40) return value;
  return `${value.slice(0, 24)}...${value.slice(-10)}`;
}

function FavoriteRow({ fav, onRemove }: { fav: Favorite; onRemove: (id: string) => void }) {
  const meta = TYPE_META[fav.type];
  return (
    <div className="flex items-start gap-3 rounded-lg border border-foreground/10 bg-card p-4">
      <div className="pt-0.5">
        <StarButton type={fav.type} value={fav.value} label={fav.label} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{fav.label}</span>
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${meta.badge}`}
          >
            {meta.label}
          </span>
        </div>
        <div className="mt-1 break-all font-mono text-xs text-foreground/55">
          {truncateValue(fav.value)}
        </div>
        <div className="mt-1 text-xs text-foreground/45">Added {formatDate(fav.addedAt)}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={favoriteHref(fav)}
          className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm transition hover:border-foreground/40"
        >
          Open
        </Link>
        <button
          type="button"
          onClick={() => onRemove(fav.id)}
          aria-label={`Remove ${fav.label} from favorites`}
          className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm text-foreground/60 transition hover:border-red-500/40 hover:text-red-500"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function FavoritesClient() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [sort, setSort] = useState<SortMode>("type");

  useEffect(() => {
    const sync = () => setFavorites(loadFavorites());
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const byType = useMemo(
    () =>
      TYPE_ORDER.map((type) => ({
        type,
        items: favorites.filter((f) => f.type === type),
      })).filter((g) => g.items.length > 0),
    [favorites],
  );

  const recent = useMemo(
    () => [...favorites].sort((a, b) => b.addedAt.localeCompare(a.addedAt)),
    [favorites],
  );

  return (
    <div className="flex-1 w-full">
      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs />
          <ThemeToggle />
        </div>

        <h1 className="mb-2 text-3xl">Favorites</h1>
        <p className="mb-8 text-foreground/70">
          Quick access to the hashes, wallets, groups, and pages you have starred. Stored only in
          this browser.
        </p>

        {favorites.length === 0 ? (
          <EmptyState
            icon={
              <svg
                viewBox="0 0 24 24"
                className="h-12 w-12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            }
            title="No favorites yet"
            description="Star items across the app for quick access."
            actionLabel="Browse the feed"
            actionHref="/feed"
          />
        ) : (
          <>
            <div className="mb-6 flex items-center gap-2">
              <span className="mr-1 text-xs uppercase tracking-wide text-foreground/50">Sort</span>
              <button
                type="button"
                onClick={() => setSort("type")}
                aria-pressed={sort === "type"}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  sort === "type"
                    ? "border-foreground/40 bg-foreground/10"
                    : "border-foreground/15 hover:border-foreground/40"
                }`}
              >
                By type
              </button>
              <button
                type="button"
                onClick={() => setSort("recent")}
                aria-pressed={sort === "recent"}
                className={`rounded-md border px-3 py-1.5 text-sm transition ${
                  sort === "recent"
                    ? "border-foreground/40 bg-foreground/10"
                    : "border-foreground/15 hover:border-foreground/40"
                }`}
              >
                Recent
              </button>
            </div>

            {sort === "type" ? (
              <div className="space-y-8">
                {byType.map((group) => (
                  <section key={group.type}>
                    <h2 className="mb-3 text-sm uppercase tracking-wide text-foreground/50">
                      {TYPE_META[group.type].plural} ({group.items.length})
                    </h2>
                    <div className="space-y-3">
                      {group.items.map((fav) => (
                        <FavoriteRow key={fav.id} fav={fav} onRemove={removeFavorite} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((fav) => (
                  <FavoriteRow key={fav.id} fav={fav} onRemove={removeFavorite} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
