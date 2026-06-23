"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FAVORITES_CHANGED_EVENT,
  type Favorite,
  favoriteHref,
  loadFavorites,
  removeFavorite,
} from "@/lib/favorites";

const COLLAPSE_KEY = "thesislock_favbar_collapsed";

function StarIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

// A slim, collapsible bar of favorite chips pinned to the top of the app shell.
// Each chip links to its target; the X removes it. Renders nothing until the
// user has favorited something. Right padding keeps the chips clear of the fixed
// nav icons in the top corner.
export default function FavoritesBar() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // localStorage may be unavailable; default to expanded.
    }
    const sync = () => setFavorites(loadFavorites());
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        // Non-fatal.
      }
      return next;
    });
  };

  if (!mounted || favorites.length === 0) return null;

  return (
    <div className="border-b border-foreground/10 bg-card/70 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-1.5 pr-2 sm:pr-48">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Show favorites" : "Hide favorites"}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-foreground/60 hover:text-foreground transition"
        >
          <StarIcon className="h-3.5 w-3.5 text-amber-500" />
          <span className="hidden sm:inline">Favorites</span>
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform ${collapsed ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {!collapsed ? (
          <div className="flex items-center gap-2 overflow-x-auto">
            {favorites.map((fav) => (
              <span
                key={fav.id}
                className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-foreground/15 bg-background py-0.5 pl-2 pr-1 text-xs"
              >
                <Link
                  href={favoriteHref(fav)}
                  className="inline-flex max-w-[10rem] items-center gap-1 text-foreground/70 hover:text-foreground"
                  title={fav.label}
                >
                  <StarIcon className="h-3 w-3 shrink-0 text-amber-500" />
                  <span className="truncate">{fav.label}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => removeFavorite(fav.id)}
                  aria-label={`Remove ${fav.label} from favorites`}
                  className="shrink-0 rounded-full p-0.5 text-foreground/40 hover:bg-foreground/10 hover:text-foreground transition"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
