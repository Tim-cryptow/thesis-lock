"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { APP_VERSION, LATEST_RELEASE } from "@/lib/version";

const VERSION_KEY = "thesislock.version.seen";

// Dispatched by the command palette's "What's New" action to open this modal on
// demand, even when the stored version already matches.
export const WHATSNEW_OPEN_EVENT = "thesislock:open-whats-new";

function readSeen(): string | null {
  try {
    return window.localStorage.getItem(VERSION_KEY);
  } catch {
    return null;
  }
}

function writeSeen(version: string): void {
  try {
    window.localStorage.setItem(VERSION_KEY, version);
  } catch {
    // Non-fatal if persistence is unavailable.
  }
}

// Shows the latest release highlights once, the first time a returning user
// loads the app after an update. A brand-new visitor (no stored version) is not
// interrupted: their version is recorded silently and the onboarding tour
// handles them. The modal can also be opened on demand from the command palette.
export default function WhatsNew() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = readSeen();
    if (seen === null) {
      // First-ever visit: record the current version without interrupting. A new
      // user is guided by the onboarding tour, not the what's-new modal.
      writeSeen(APP_VERSION);
      return;
    }
    if (seen !== APP_VERSION) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(WHATSNEW_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WHATSNEW_OPEN_EVENT, onOpen);
  }, []);

  const dismiss = useCallback(() => {
    writeSeen(APP_VERSION);
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={dismiss}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-foreground/15 bg-card p-6 shadow-xl"
      >
        <h2 id="whats-new-title" className="text-xl">
          What&rsquo;s new in v{APP_VERSION}
        </h2>
        <p className="mt-1 text-sm text-foreground/60">{LATEST_RELEASE.title}</p>

        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-foreground/80">
          {LATEST_RELEASE.highlights.map((highlight, index) => (
            <li key={index} className="leading-relaxed">
              {highlight}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-4">
          <Link
            href="/changelog"
            onClick={dismiss}
            className="text-sm underline transition hover:text-foreground"
          >
            See full changelog
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md bg-heading px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
