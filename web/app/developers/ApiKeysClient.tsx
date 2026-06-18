"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PERMISSION_LABELS,
  deleteKey,
  loadKeys,
  maskKey,
  saveKeys,
  type ApiKeyRecord,
} from "@/lib/apiKeys";
import KeyCreationModal from "./KeyCreationModal";

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown";
  }
}

export default function ApiKeysClient() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // localStorage is only available in the browser, so keys are loaded after
  // mount rather than during the initial (client-only) render.
  useEffect(() => {
    setKeys(loadKeys());
  }, []);

  const addKey = useCallback((record: ApiKeyRecord) => {
    setKeys((prev) => {
      const next = [record, ...prev];
      saveKeys(next);
      return next;
    });
  }, []);

  const revoke = useCallback((id: string, name: string) => {
    if (
      !window.confirm(
        `Revoke "${name}"? Any integration using this key will stop working.`,
      )
    ) {
      return;
    }
    setKeys(deleteKey(id));
  }, []);

  const startEdit = useCallback((key: ApiKeyRecord) => {
    setEditingId(key.id);
    setEditName(key.name);
  }, []);

  const commitEdit = useCallback(() => {
    const trimmed = editName.trim();
    setKeys((prev) => {
      const next = trimmed
        ? prev.map((k) =>
            k.id === editingId ? { ...k, name: trimmed } : k,
          )
        : prev;
      saveKeys(next);
      return next;
    });
    setEditingId(null);
    setEditName("");
  }, [editName, editingId]);

  const copyKey = useCallback(async (key: ApiKeyRecord) => {
    try {
      await navigator.clipboard.writeText(key.key);
      setCopiedId(key.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl">API Keys</h2>
          <p className="mt-1 text-sm text-foreground/70">
            Create and manage keys for integrating ThesisLock into your apps.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          Create new API key
        </button>
      </div>

      <div className="rounded-md border border-foreground/10 bg-foreground/5 px-4 py-3 text-sm text-foreground/70">
        API keys are stored in your browser&apos;s local storage. For production
        use, implement server-side key validation.
      </div>

      {keys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-foreground/15 px-6 py-12 text-center">
          <p className="text-foreground/70">
            No API keys yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-foreground/10">
          <table className="w-full min-w-[48rem] text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-left text-foreground/60">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last Used</th>
                <th className="px-4 py-3 font-medium">Requests</th>
                <th className="px-4 py-3 font-medium">Permissions</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr
                  key={key.id}
                  className="border-b border-foreground/5 align-top last:border-0"
                >
                  <td className="px-4 py-3">
                    {editingId === key.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditName("");
                          }
                        }}
                        autoFocus
                        className="w-full rounded-md border border-foreground/20 bg-background px-2 py-1 text-sm outline-none focus:border-foreground/50"
                      />
                    ) : (
                      <span className="font-medium">{key.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-foreground/70">
                    {maskKey(key.key)}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {formatDate(key.created)}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {formatDate(key.lastUsed)}
                  </td>
                  <td className="px-4 py-3 text-foreground/70">
                    {key.requestCount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {key.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="rounded bg-foreground/10 px-1.5 py-0.5 text-xs text-foreground/70"
                        >
                          {PERMISSION_LABELS[permission] ?? permission}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => copyKey(key)}
                        className="text-foreground/60 hover:text-foreground"
                      >
                        {copiedId === key.id ? "Copied!" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(key)}
                        className="text-foreground/60 hover:text-foreground"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(key.id, key.name)}
                        className="text-red-600 hover:text-red-500 dark:text-red-400"
                      >
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating ? (
        <KeyCreationModal
          onCreate={addKey}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </div>
  );
}
