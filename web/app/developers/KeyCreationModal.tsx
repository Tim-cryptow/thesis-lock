"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AVAILABLE_PERMISSIONS,
  PERMISSION_LABELS,
  generateApiKey,
  generateKeyId,
  type ApiKeyRecord,
} from "@/lib/apiKeys";

type Props = {
  // Persists the newly created key. Called once, when the key is generated.
  onCreate: (record: ApiKeyRecord) => void;
  // Closes the modal. Only wired to the final "I've saved my key" action so a
  // stray click outside cannot dismiss the one-time key reveal.
  onClose: () => void;
};

type Step = "form" | "reveal";

export default function KeyCreationModal({ onCreate, onClose }: Props) {
  const [step, setStep] = useState<Step>("form");
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState<string[]>([
    ...AVAILABLE_PERMISSIONS,
  ]);
  const [createdKey, setCreatedKey] = useState("");
  const [copied, setCopied] = useState(false);

  const trimmedName = name.trim();
  const canGenerate = trimmedName.length > 0 && permissions.length > 0;

  const togglePermission = useCallback((permission: string) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission],
    );
  }, []);

  const generate = useCallback(() => {
    if (!canGenerate) return;
    const key = generateApiKey();
    const record: ApiKeyRecord = {
      id: generateKeyId(),
      key,
      name: trimmedName,
      created: new Date().toISOString(),
      lastUsed: null,
      requestCount: 0,
      permissions,
    };
    onCreate(record);
    setCreatedKey(key);
    setStep("reveal");
  }, [canGenerate, trimmedName, permissions, onCreate]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the key stays visible for manual copy.
    }
  }, [createdKey]);

  // Escape only closes from the form step. During the reveal step the key must
  // be acknowledged explicitly so it is not lost by accident.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && step === "form") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create API key"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-foreground/15 bg-card shadow-xl">
        <div className="relative">
          {step === "form" ? (
            <div className="p-6 transition-opacity duration-200">
              <h2 className="text-xl">Create API key</h2>
              <p className="mt-1 text-sm text-foreground/60">
                Name the key and choose which API surfaces it can call.
              </p>

              <label className="mt-6 block text-sm font-medium">
                Key name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Research App"
                  autoFocus
                  className="mt-1.5 w-full rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
                />
              </label>

              <fieldset className="mt-5">
                <legend className="text-sm font-medium">Permissions</legend>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {AVAILABLE_PERMISSIONS.map((permission) => {
                    const checked = permissions.includes(permission);
                    return (
                      <label
                        key={permission}
                        className="flex items-center gap-2 rounded-md border border-foreground/10 px-3 py-2 text-sm hover:border-foreground/30"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(permission)}
                          className="accent-foreground"
                        />
                        {PERMISSION_LABELS[permission]}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-sm text-foreground/60 hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={generate}
                  disabled={!canGenerate}
                  className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Generate key
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 transition-opacity duration-200">
              <h2 className="text-xl">Your new API key</h2>
              <div className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
                Save this key now. Copy it and store it somewhere safe.
              </div>

              <div className="mt-4 flex items-stretch gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-foreground/15 bg-background px-3 py-2 font-mono text-sm">
                  {createdKey}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="shrink-0 rounded-md border border-foreground/15 px-3 py-2 text-sm hover:border-foreground/40"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <p className="mt-4 text-sm text-foreground/60">
                Store it in a password manager or your environment. The key lives
                only in this browser; clearing site data removes it.
              </p>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
                >
                  I&apos;ve saved my key
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
