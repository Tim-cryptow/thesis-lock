"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useI18n } from "./I18nProvider";
import ShortcutsModal from "./ShortcutsModal";

// Dispatched when the search input should grab focus while already on /search.
export const FOCUS_SEARCH_EVENT = "thesislock:focus-search";
// Read once on the search page mount to focus after a cross-page navigation.
export const FOCUS_SEARCH_FLAG = "thesislock.focusSearch";

// The "mod" token renders as the platform modifier (Cmd on mac, Ctrl elsewhere).
// descriptionKey is a leaf under common.shortcuts.items, translated at render.
export type Shortcut = { keys: string[]; descriptionKey: string };

export const SHORTCUTS: Shortcut[] = [
  { keys: ["mod", "K"], descriptionKey: "focusSearch" },
  { keys: ["/"], descriptionKey: "focusSearch" },
  { keys: ["mod", "N"], descriptionKey: "newAnchor" },
  { keys: ["mod", "G"], descriptionKey: "groups" },
  { keys: ["mod", "H"], descriptionKey: "anchorHistory" },
  { keys: ["mod", "D"], descriptionKey: "documentation" },
  { keys: ["mod", "."], descriptionKey: "toggleTheme" },
  { keys: ["?"], descriptionKey: "showHelp" },
];

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
  const { t } = useI18n();
  const [helpOpen, setHelpOpen] = useState(false);

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

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((open) => !open);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        focusSearch();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, cycle, focusSearch]);

  return (
    <>
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        title={t("common.shortcuts.buttonTitle")}
        aria-label={t("common.shortcuts.buttonAria")}
        className="fixed bottom-4 right-4 z-40 inline-flex h-8 w-8 items-center justify-center rounded-full border border-foreground/15 bg-card font-mono text-sm text-foreground/50 opacity-40 hover:opacity-100 hover:border-foreground/40 hover:text-foreground transition"
      >
        ?
      </button>
      <ShortcutsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
