"use client";

import { useEffect, useState } from "react";
import { SHORTCUTS } from "./KeyboardShortcuts";

function useModLabel(): string {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);
  return isMac ? "Cmd" : "Ctrl";
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-foreground/20 bg-foreground/5 px-1.5 py-0.5 font-mono text-xs text-foreground/80">
      {children}
    </kbd>
  );
}

export default function ShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const modLabel = useModLabel();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-foreground/15 bg-card p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg text-heading">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground/50 hover:bg-foreground/5 hover:text-foreground transition"
          >
            &times;
          </button>
        </div>

        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={`${shortcut.keys.join("+")}-${shortcut.description}`}
              className="contents"
            >
              <dt className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <Kbd key={i}>{key === "mod" ? modLabel : key}</Kbd>
                ))}
              </dt>
              <dd className="text-sm text-foreground/70">
                {shortcut.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
