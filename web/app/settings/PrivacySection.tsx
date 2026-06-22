"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isAuditEnabled,
  setAuditEnabled,
  clearAuditLog,
  getAuditRetentionDays,
  setAuditRetentionDays,
  applyAuditRetention,
  AUDIT_RETENTION_OPTIONS,
} from "@/lib/audit";
import {
  isPerfTrackingEnabled,
  setPerfTrackingEnabled,
  clearPerformanceData,
} from "@/lib/performance";
import { clearAll as clearNotifications } from "@/lib/notifications";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  type Category,
  categoryForKey,
  clearCategory,
  getAllLocalStorageKeys,
} from "@/lib/dataPortability";

function retentionLabel(days: number): string {
  return days === 0 ? "Unlimited" : `${days} days`;
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? "bg-emerald-500" : "bg-foreground/25"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm text-foreground">{label}</div>
        {hint ? <div className="text-xs text-foreground/55">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

export default function PrivacySection() {
  const [auditOn, setAuditOn] = useState(true);
  const [perfOn, setPerfOn] = useState(true);
  const [retention, setRetention] = useState(0);
  const [keysByCategory, setKeysByCategory] = useState<Record<string, string[]>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);

  const refreshKeys = useCallback(() => {
    const grouped: Record<string, string[]> = {};
    for (const key of getAllLocalStorageKeys()) {
      const category = categoryForKey(key);
      (grouped[category] ??= []).push(key);
    }
    setKeysByCategory(grouped);
  }, []);

  useEffect(() => {
    setAuditOn(isAuditEnabled());
    setPerfOn(isPerfTrackingEnabled());
    setRetention(getAuditRetentionDays());
    refreshKeys();
  }, [refreshKeys]);

  const runClear = useCallback(
    (label: string, run: () => void) => {
      run();
      refreshKeys();
      setMessage(`${label} cleared.`);
    },
    [refreshKeys],
  );

  const clearActions: { label: string; run: () => void }[] = [
    { label: "Search history", run: () => clearCategory("recentSearches") },
    { label: "API request history", run: () => clearCategory("requestHistory") },
    { label: "Performance data", run: () => clearPerformanceData() },
    { label: "Audit log", run: () => clearAuditLog() },
    { label: "Notification history", run: () => clearNotifications() },
  ];

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm text-foreground/70 max-w-2xl">
        Decide what ThesisLock records on this device and clear anything you no
        longer want kept.
      </p>

      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-xl mb-1">Tracking</h2>
        <p className="text-sm text-foreground/65 mb-4 max-w-2xl">
          These records are local and tamper-evident, never sent anywhere. Turn
          them off if you would rather they not be kept.
        </p>
        <div className="flex flex-col gap-4">
          <Row
            label="Audit log"
            hint="Record a tamper-evident history of your actions."
          >
            <Switch
              label="Audit log"
              checked={auditOn}
              onChange={(v) => {
                setAuditOn(v);
                setAuditEnabled(v);
              }}
            />
          </Row>
          <Row
            label="Performance monitoring"
            hint="Capture Web Vitals and timing metrics in your browser."
          >
            <Switch
              label="Performance monitoring"
              checked={perfOn}
              onChange={(v) => {
                setPerfOn(v);
                setPerfTrackingEnabled(v);
              }}
            />
          </Row>
        </div>
      </section>

      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-xl mb-1">Data retention</h2>
        <p className="text-sm text-foreground/65 mb-4 max-w-2xl">
          Automatically drop audit log entries older than the chosen age. Applied
          immediately and whenever a new action is recorded.
        </p>
        <Row label="Keep audit entries for">
          <select
            value={retention}
            onChange={(e) => {
              const days = Number(e.target.value);
              setRetention(days);
              setAuditRetentionDays(days);
              applyAuditRetention();
              refreshKeys();
            }}
            className="rounded-md border border-foreground/20 bg-background px-3 py-1.5 text-sm outline-none focus-visible:border-foreground/40"
          >
            {AUDIT_RETENTION_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {retentionLabel(days)}
              </option>
            ))}
          </select>
        </Row>
      </section>

      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-xl mb-1">Clear specific data</h2>
        <p className="text-sm text-foreground/65 mb-4 max-w-2xl">
          Remove one kind of data without touching the rest. This cannot be
          undone.
        </p>
        <div className="flex flex-wrap gap-3">
          {clearActions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={() => runClear(action.label, action.run)}
              className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm transition hover:border-red-500/50 hover:text-red-600 dark:hover:text-red-400"
            >
              Clear {action.label.toLowerCase()}
            </button>
          ))}
        </div>
        {message ? (
          <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
            {message}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-foreground/10 bg-card p-5">
        <h2 className="text-xl mb-1">What data does ThesisLock store?</h2>
        <p className="text-sm text-foreground/70 mb-2 max-w-2xl">
          All ThesisLock data is stored locally in your browser. No data is sent
          to any server except the Stacks blockchain transactions you sign, which
          are public by design. Hashing happens entirely on your device, so your
          documents never leave it.
        </p>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-foreground/70 hover:text-foreground">
            Show everything stored on this device
          </summary>
          <ul className="mt-3 flex flex-col gap-3">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((category) => {
              const keys = keysByCategory[category] ?? [];
              return (
                <li key={category}>
                  <div className="text-foreground">
                    {CATEGORY_LABELS[category]}
                  </div>
                  <div className="text-foreground/60">
                    {CATEGORY_DESCRIPTIONS[category]}
                  </div>
                  <div className="mt-1 text-xs text-foreground/45 mono break-all">
                    {keys.length > 0 ? keys.join(", ") : "nothing stored"}
                  </div>
                </li>
              );
            })}
          </ul>
        </details>
      </section>
    </div>
  );
}
