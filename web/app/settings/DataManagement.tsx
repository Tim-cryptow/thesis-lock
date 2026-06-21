"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BACKUP_REMINDER_DAYS,
  daysSinceBackup,
  downloadExport,
  exportAllData,
  getLastBackup,
} from "@/lib/dataPortability";

function formatTimestamp(iso: string | null): string {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleString();
}

export default function DataManagement() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [staleDays, setStaleDays] = useState<number | null>(null);

  const refresh = useCallback(() => {
    setLastBackup(getLastBackup());
    setStaleDays(daysSinceBackup());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onExport = useCallback(() => {
    downloadExport(exportAllData());
    refresh();
  }, [refresh]);

  const reminderDue = staleDays === null || staleDays >= BACKUP_REMINDER_DAYS;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-foreground/70 max-w-2xl">
        Everything below lives only in this browser. Export a backup to keep a
        copy or move your data to another device, then restore it there.
      </p>

      <section
        aria-labelledby="backup-heading"
        className="rounded-lg border border-foreground/10 bg-card p-5"
      >
        <h2 id="backup-heading" className="text-xl mb-1">
          Backup
        </h2>
        <p className="text-sm text-foreground/65 mb-4 max-w-2xl">
          Download a single JSON file with all of your ThesisLock data:
          collections, tags, watchlist, audit log, preferences, and more.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onExport}
            className="rounded-md bg-heading px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
          >
            Export All Data
          </button>
          <span className="text-sm text-foreground/60">
            Last backup: {formatTimestamp(lastBackup)}
          </span>
        </div>

        {reminderDue ? (
          <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            {lastBackup
              ? `It has been ${staleDays ?? BACKUP_REMINDER_DAYS}+ days since your last backup. Consider exporting again to stay current.`
              : "You have not backed up yet. Export your data so you can restore it if you switch devices or clear your browser."}
          </p>
        ) : null}
      </section>
    </div>
  );
}
