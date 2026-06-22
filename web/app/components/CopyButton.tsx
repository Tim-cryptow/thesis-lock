"use client";

import { useCallback, useState } from "react";

// Window event other components (such as the global clipboard toast) listen for
// whenever something is copied. The detail carries the copied value.
export const CLIPBOARD_COPY_EVENT = "thesislock:clipboard-copy";

export type ClipboardCopyDetail = { value: string };

// Single place every copy interaction goes through, so feedback stays
// consistent across the app. Returns whether the copy succeeded.
export async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(value);
    try {
      window.dispatchEvent(
        new CustomEvent<ClipboardCopyDetail>(CLIPBOARD_COPY_EVENT, {
          detail: { value },
        }),
      );
    } catch {
      // CustomEvent may be unavailable in exotic environments; non-fatal.
    }
    return true;
  } catch {
    // Clipboard can be unavailable in insecure contexts; treat as a no-op.
    return false;
  }
}

type CopyButtonProps = {
  value: string;
  // Describes what is being copied, used in the accessible label.
  label?: string;
  size?: "sm" | "md";
  // When true, render the value next to the button (monospace).
  showValue?: boolean;
};

function ClipboardIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function CopyButton({
  value,
  label,
  size = "md",
  showValue = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const ariaLabel = label ? `Copy ${label} to clipboard` : "Copy to clipboard";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const padding = size === "sm" ? "p-1" : "p-1.5";

  const onCopy = useCallback(async () => {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <span className="relative inline-flex items-center gap-1.5">
      {showValue ? (
        <span className="mono text-xs break-all">{value}</span>
      ) : null}
      <button
        type="button"
        onClick={() => void onCopy()}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`inline-flex items-center justify-center rounded border border-foreground/15 text-foreground/60 transition hover:border-foreground/40 hover:text-foreground ${padding}`}
      >
        {copied ? (
          <CheckIcon className={`${iconSize} text-emerald-500`} />
        ) : (
          <ClipboardIcon className={iconSize} />
        )}
      </button>
      {copied ? (
        <span
          role="status"
          className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-heading px-2 py-0.5 text-[10px] font-medium text-background shadow"
        >
          Copied!
        </span>
      ) : null}
    </span>
  );
}
