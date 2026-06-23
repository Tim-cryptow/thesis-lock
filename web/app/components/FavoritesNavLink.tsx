"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FAVORITES_CHANGED_EVENT, loadFavorites } from "@/lib/favorites";

// Fixed star mounted once in the root layout so it appears on every page without
// a shared nav component, alongside the notification bell and settings link.
// Links to the favorites page and shows the saved count as a badge.
export default function FavoritesNavLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(loadFavorites().length);
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <Link
      href="/favorites"
      aria-label={count > 0 ? `Favorites, ${count} saved` : "Favorites"}
      title="Favorites"
      className="fixed right-[9rem] top-2 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-foreground/15 bg-card text-foreground/70 shadow-sm transition hover:border-foreground/30 hover:text-foreground"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-none text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
