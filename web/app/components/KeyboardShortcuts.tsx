"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";

// Dispatched when the search input should grab focus while already on /search.
export const FOCUS_SEARCH_EVENT = "thesislock:focus-search";
// Read once on the search page mount to focus after a cross-page navigation.
export const FOCUS_SEARCH_FLAG = "thesislock.focusSearch";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const { cycle } = useTheme();

  const focusSearch = useCallback(() => {
    if (pathname === "/search") {
      window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
      return;
    }
    try {
      window.sessionStorage.setItem(FOCUS_SEARCH_FLAG, "1");
    } catch {
      // Non-fatal if sessionStorage is unavailable.
    }
    router.push("/search");
  }, [pathname, router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod) {
        switch (e.key.toLowerCase()) {
          case "k":
            e.preventDefault();
            focusSearch();
            return;
          case "n":
            e.preventDefault();
            router.push("/anchor");
            return;
          case "g":
            e.preventDefault();
            router.push("/groups");
            return;
          case "h":
            e.preventDefault();
            router.push("/anchors");
            return;
          case "d":
            e.preventDefault();
            router.push("/docs");
            return;
          case ".":
            e.preventDefault();
            cycle();
            return;
          default:
            return;
        }
      }

      if (e.key === "/") {
        e.preventDefault();
        focusSearch();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, cycle, focusSearch]);

  return null;
}
