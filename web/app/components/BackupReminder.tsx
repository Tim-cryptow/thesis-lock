"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { needsBackupReminder } from "@/lib/dataPortability";

// Dismissed for the current tab session, so the nudge does not repeat on every
// navigation but returns in a fresh session if a backup is still overdue.
const DISMISS_KEY = "thesislock_backup_reminder_dismissed";

export default function BackupReminder() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // sessionStorage may be unavailable; fall through to the check.
    }
    setShow(needsBackupReminder());
  }, []);

  // The settings page already surfaces backup controls, so do not nag there.
  if (!show || pathname?.startsWith("/settings")) return null;

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Non-fatal.
    }
    setShow(false);
  };

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <span>
          It has been a while since your last backup.{" "}
          <Link href="/settings#data" className="underline hover:opacity-80">
            Back up your data
          </Link>{" "}
          so you do not lose it.
        </span>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss backup reminder"
          className="shrink-0 rounded px-2 py-0.5 text-amber-700/80 transition hover:text-amber-900 dark:text-amber-300/80 dark:hover:text-amber-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
