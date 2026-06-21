"use client";

import { useCallback, useEffect, useState } from "react";
import FileDropZone from "@/app/components/FileDropZone";
import {
  BACKUP_REMINDER_DAYS,
  CATEGORY_LABELS,
  type Category,
  type UserDataExport,
  daysSinceBackup,
  downloadExport,
  exportAllData,
  getLastBackup,
  importAllData,
  validateImport,
} from "@/lib/dataPortability";

type ImportMode = "merge" | "replace";

type Preview = {
  valid: boolean;
  version: string;
  dataKeys: string[];
  warnings: string[];
};

type ImportResult = { imported: number; skipped: number; errors: string[] };

function formatTimestamp(iso: string | null): string {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "never";
  return date.toLocaleString();
}

function categoryLabel(name: string): string {
  return CATEGORY_LABELS[name as Category] ?? name;
}

export default function DataManagement() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [staleDays, setStaleDays] = useState<number | null>(null);

  // Restore flow state.
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [parsed, setParsed] = useState<UserDataExport | null>(null);
  const [exportedAt, setExportedAt] = useState<string | null>(null);
  const [exportedBy, setExportedBy] = useState<string | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

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

  const onFile = useCallback(async (file: File) => {
    setResult(null);
    setFileName(file.name);
    let text = "";
    try {
      text = await file.text();
    } catch {
      setPreview({
        valid: false,
        version: "",
        dataKeys: [],
        warnings: ["The file could not be read."],
      });
      setParsed(null);
      return;
    }
    const pv = validateImport(text);
    setPreview(pv);
    if (pv.valid) {
      try {
        const obj = JSON.parse(text) as UserDataExport;
        setParsed(obj);
        setExportedAt(obj.exportedAt ?? null);
        setExportedBy(obj.exportedBy ?? null);
      } catch {
        setParsed(null);
      }
    } else {
      setParsed(null);
    }
  }, []);

  const confirmImport = useCallback(() => {
    if (!parsed) return;
    const r = importAllData(parsed, mode);
    setResult(r);
    setConfirmOpen(false);
    refresh();
  }, [parsed, mode, refresh]);

  const resetRestore = useCallback(() => {
    setFileName(null);
    setPreview(null);
    setParsed(null);
    setExportedAt(null);
    setExportedBy(null);
    setResult(null);
  }, []);

  const reminderDue = staleDays === null || staleDays >= BACKUP_REMINDER_DAYS;

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-foreground/70 max-w-2xl">
        Everything below lives only in this browser. Export a backup to keep a
        copy or move your data to another device, then restore it there.
      </p>

      {/* Backup */}
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

      {/* Restore */}
      <section
        aria-labelledby="restore-heading"
        className="rounded-lg border border-foreground/10 bg-card p-5"
      >
        <h2 id="restore-heading" className="text-xl mb-1">
          Restore
        </h2>
        <p className="text-sm text-foreground/65 mb-4 max-w-2xl">
          Load a backup file exported from ThesisLock. You will see a preview and
          choose how to apply it before anything changes.
        </p>

        <FileDropZone onFile={onFile} ariaLabel="Choose a backup file, or drop one here">
          <p className="text-foreground/60">
            Drop a <span className="mono">.json</span> backup here, or click to
            choose one
          </p>
          {fileName ? (
            <p className="mt-2 text-sm text-foreground/50">Selected: {fileName}</p>
          ) : null}
        </FileDropZone>

        {preview && !preview.valid ? (
          <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            <p className="font-medium">This file is not a valid backup.</p>
            <ul className="mt-1 list-disc pl-5">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {preview && preview.valid ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="rounded-md border border-foreground/10 bg-background/40 p-4 text-sm">
              <h3 className="text-base mb-2">Backup preview</h3>
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1">
                <dt className="text-foreground/55">Version</dt>
                <dd>{preview.version || "unknown"}</dd>
                <dt className="text-foreground/55">Exported</dt>
                <dd>{formatTimestamp(exportedAt)}</dd>
                <dt className="text-foreground/55">Exported by</dt>
                <dd className="mono break-all">{exportedBy ?? "anonymous"}</dd>
                <dt className="text-foreground/55">Contains</dt>
                <dd>
                  {preview.dataKeys.length > 0
                    ? preview.dataKeys.map(categoryLabel).join(", ")
                    : "no data"}
                </dd>
              </dl>
              {preview.warnings.length > 0 ? (
                <ul className="mt-3 list-disc pl-5 text-amber-700 dark:text-amber-400">
                  {preview.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm text-foreground/55 mb-1">
                How should this be applied?
              </legend>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="import-mode"
                  className="mt-1"
                  checked={mode === "merge"}
                  onChange={() => setMode("merge")}
                />
                <span>
                  <span className="font-medium">Merge with existing</span>
                  <span className="block text-foreground/55">
                    Keep current data and add anything new. Collections and tags
                    are combined.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="import-mode"
                  className="mt-1"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                />
                <span>
                  <span className="font-medium">Replace all data</span>
                  <span className="block text-foreground/55">
                    Erase current data first, then load the backup. Cannot be
                    undone.
                  </span>
                </span>
              </label>
            </fieldset>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                disabled={!parsed}
                className="rounded-md bg-heading px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
              >
                Import
              </button>
              <button
                type="button"
                onClick={resetRestore}
                className="rounded-md border border-foreground/20 px-4 py-2 text-sm transition hover:border-foreground/40"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {result ? (
          <div className="mt-4 rounded-md border border-foreground/10 bg-background/40 p-4 text-sm">
            <p className="font-medium">
              Imported {result.imported}, skipped {result.skipped}, errors{" "}
              {result.errors.length}.
            </p>
            {result.errors.length > 0 ? (
              <ul className="mt-2 list-disc pl-5 text-red-700 dark:text-red-400">
                {result.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-md border border-foreground/20 px-3 py-1.5 text-sm transition hover:border-foreground/40"
            >
              Reload to apply changes
            </button>
          </div>
        ) : null}
      </section>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-confirm-title"
        >
          <div className="w-full max-w-md rounded-lg border border-foreground/15 bg-card p-6 shadow-lg">
            <h3 id="import-confirm-title" className="text-lg mb-2">
              Confirm import
            </h3>
            <p className="text-sm text-foreground/70 mb-4">
              {mode === "replace"
                ? "Replace mode will erase all current ThesisLock data in this browser and load the backup in its place. This cannot be undone."
                : "Merge mode will add data from the backup without removing what you already have."}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md border border-foreground/20 px-4 py-2 text-sm transition hover:border-foreground/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImport}
                className="rounded-md bg-heading px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
              >
                {mode === "replace" ? "Replace data" : "Merge data"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
