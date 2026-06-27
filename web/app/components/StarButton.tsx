"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FAVORITES_CHANGED_EVENT,
  isFavorite,
  toggleFavorite,
  type FavoriteType,
} from "@/lib/favorites";

type StarButtonProps = {
  type: FavoriteType;
  value: string;
  label: string;
  className?: string;
};

// A small star toggle that favorites the given hash, wallet, group, or page.
// Reusable inline next to any item. Shows a hollow star when not favorited and a
// filled amber star when favorited, with a brief pop on toggle.
export default function StarButton({ type, value, label, className = "" }: StarButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [pop, setPop] = useState(false);

  // Reflect the stored state, and keep in sync with changes from elsewhere
  // (another star for the same item, the favorites bar, or another tab).
  useEffect(() => {
    const sync = () => setFavorited(isFavorite(type, value));
    sync();
    window.addEventListener(FAVORITES_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [type, value]);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      // Stars often sit inside links or clickable rows; keep the click local.
      e.preventDefault();
      e.stopPropagation();
      setFavorited(toggleFavorite(type, value, label));
      setPop(true);
      window.setTimeout(() => setPop(false), 200);
    },
    [type, value, label],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`inline-flex shrink-0 items-center justify-center ${
        favorited ? "text-amber-500" : "text-foreground/40 hover:text-amber-500"
      } transition ${className}`}
      style={{
        transform: pop ? "scale(1.3)" : "scale(1)",
        transition: "transform 0.15s ease, color 0.15s ease",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={favorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    </button>
  );
}
