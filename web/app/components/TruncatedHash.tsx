"use client";

import CopyButton, { copyToClipboard } from "./CopyButton";

type TruncatedHashProps = {
  hash: string;
  // Number of characters to keep on each side.
  chars?: number;
  copyable?: boolean;
};

function truncate(hash: string, chars: number): string {
  if (hash.length <= chars * 2 + 1) return hash;
  return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
}

// Displays a hash as first/last characters in monospace, with the full value on
// hover. Clicking the text copies it, and an inline CopyButton is shown by
// default. Used wherever a long hash needs a compact, consistent display.
export default function TruncatedHash({
  hash,
  chars = 8,
  copyable = true,
}: TruncatedHashProps) {
  if (!hash) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void copyToClipboard(hash)}
        title={hash}
        aria-label={`Copy hash ${hash} to clipboard`}
        className="mono text-xs text-foreground/80 transition hover:text-foreground"
      >
        {truncate(hash, chars)}
      </button>
      {copyable ? <CopyButton value={hash} label="hash" size="sm" /> : null}
    </span>
  );
}
