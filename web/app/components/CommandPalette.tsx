"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PALETTE_OPEN_EVENT,
  filterItems,
  getAllItems,
  type PaletteItem,
  type PaletteSection,
} from "@/lib/commandPalette";

// Order the sections are rendered (and keyboard-navigated) in.
const SECTION_ORDER: PaletteSection[] = ["recent", "pages", "actions"];
const SECTION_LABELS: Record<PaletteSection, string> = {
  recent: "Recent",
  pages: "Pages",
  actions: "Actions",
};

// Minimal icon set keyed by PaletteItem.icon, with a generic fallback.
function PaletteIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    anchor: <path d="M12 2v20M5 12H2a10 10 0 0 0 20 0h-3M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
    shield: <path d="M12 3 4 6v6c0 4 3.5 7.5 8 9 4.5-1.5 8-5 8-9V6z" />,
    history: <><path d="M3 3v6h6" /><path d="M3 9a9 9 0 1 0 3-6.7L3 9" /><path d="M12 7v5l4 2" /></>,
    chart: <path d="M3 3v18h18M7 15l3-4 4 3 5-7" />,
    group: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 11a3 3 0 1 0-1-5.8" /></>,
    feed: <><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" /><circle cx="5" cy="19" r="1" /></>,
    activity: <path d="M3 12h4l3 8 4-16 3 8h4" />,
    compare: <path d="M12 3v18M5 7l-3 5 3 5M19 7l3 5-3 5" />,
    doc: <><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /></>,
    code: <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-foreground/60"
      aria-hidden="true"
    >
      {paths[name] ?? paths.doc}
    </svg>
  );
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  // Toggle open in response to the keyboard shortcut handler.
  useEffect(() => {
    const onOpen = () => setOpen((o) => !o);
    window.addEventListener(PALETTE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(PALETTE_OPEN_EVENT, onOpen);
  }, []);

  // Focus the input each time the palette opens.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // The full catalog filtered by the query, then grouped and flattened in the
  // section render order so arrow-key navigation matches what is on screen.
  const ordered = useMemo(() => {
    const filtered = filterItems(query, getAllItems());
    const out: PaletteItem[] = [];
    for (const section of SECTION_ORDER) {
      out.push(...filtered.filter((i) => i.section === section));
    }
    return out;
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const runItem = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      if (item.path) {
        router.push(item.path);
        close();
        return;
      }
      item.action?.();
      close();
    },
    [router, close],
  );

  // Arrow/enter/escape handling while open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(ordered.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        runItem(ordered[activeIndex]);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, ordered, activeIndex, runItem, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-lg border border-foreground/15 bg-card shadow-xl"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages and actions..."
          className="w-full border-b border-foreground/10 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none"
        />
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {ordered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-foreground/50">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            SECTION_ORDER.map((section) => {
              const rows = ordered.filter((i) => i.section === section);
              if (rows.length === 0) return null;
              return (
                <div key={section} className="mb-1">
                  <p className="px-4 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-foreground/40">
                    {SECTION_LABELS[section]}
                  </p>
                  {rows.map((item) => {
                    const flatIndex = ordered.indexOf(item);
                    const active = flatIndex === activeIndex;
                    return (
                      <button
                        key={`${section}:${item.id}`}
                        type="button"
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        onClick={() => runItem(item)}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left transition ${
                          active ? "bg-foreground/5" : ""
                        }`}
                      >
                        <PaletteIcon name={item.icon} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">
                            {item.title}
                          </span>
                          <span className="block truncate text-xs text-foreground/50">
                            {item.description}
                          </span>
                        </span>
                        {item.shortcut && (
                          <kbd className="rounded border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 font-mono text-[0.65rem] text-foreground/60">
                            {item.shortcut}
                          </kbd>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
