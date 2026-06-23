"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { hashFile } from "@/lib/stacks";
import FileDropZone from "@/app/components/FileDropZone";
import FilePreview from "@/app/components/FilePreview";

type SideMode = "hash" | "file";

type HashMatcherProps = {
  // How each side obtains its hash: by pasting one, or by dropping a file.
  leftMode?: SideMode;
  rightMode?: SideMode;
  // Pre-fill and optionally lock the left hash (used on the verify page).
  initialLeftHash?: string;
  lockLeft?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  // When the two hashes match, offer a link to verify the hash on chain.
  showVerifyLink?: boolean;
};

const HEX_64 = /^[0-9a-f]{64}$/;

function normalizeHash(value: string): string {
  return value.trim().toLowerCase().replace(/^0x/, "");
}

// Renders a hash, coloring each character red where it differs from the other
// hash (including any characters past the other hash's length).
function HashDiff({ value, other }: { value: string; other: string }) {
  return (
    <code className="block break-all font-mono text-xs leading-relaxed">
      {value.split("").map((ch, i) => (
        <span
          key={i}
          className={
            other[i] === ch
              ? "text-foreground/70"
              : "font-semibold text-red-500"
          }
        >
          {ch}
        </span>
      ))}
    </code>
  );
}

function SidePanel({
  label,
  mode,
  lock,
  value,
  onChange,
  file,
  fileHash,
  hashing,
  onFile,
}: {
  label: string;
  mode: SideMode;
  lock: boolean;
  value: string;
  onChange: (value: string) => void;
  file: File | null;
  fileHash: string | null;
  hashing: boolean;
  onFile: (file: File) => void;
}) {
  const invalid =
    mode === "hash" && value.trim().length > 0 && !HEX_64.test(normalizeHash(value));

  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
        {label}
      </div>
      {mode === "hash" ? (
        lock ? (
          <code className="block break-all rounded bg-foreground/5 px-3 py-2 font-mono text-xs md:text-sm">
            {normalizeHash(value)}
          </code>
        ) : (
          <>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Paste a SHA-256 hash"
              rows={3}
              spellCheck={false}
              aria-label={`${label} hash`}
              className="w-full resize-none rounded-md border border-foreground/15 bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground/40"
            />
            {invalid ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                Not a 64-character SHA-256 hash yet.
              </p>
            ) : null}
          </>
        )
      ) : (
        <>
          <FileDropZone onFile={onFile} ariaLabel={`Drop a file to hash for ${label}`}>
            <p className="text-sm text-foreground/60">
              {file
                ? "Drop another file to replace"
                : "Drop a file here, or click to choose"}
            </p>
          </FileDropZone>
          {file ? (
            <div className="mt-3">
              <FilePreview file={file} hash={fileHash} hashing={hashing} compact />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

// Compares two hashes side by side: each side is either a pasted hash or a
// dropped file (hashed in the browser). Shows whether they match and a
// character-level diff for manual inspection.
export default function HashMatcher({
  leftMode = "hash",
  rightMode = "file",
  initialLeftHash,
  lockLeft = false,
  leftLabel = "Original",
  rightLabel = "Compare",
  showVerifyLink = false,
}: HashMatcherProps) {
  const [leftInput, setLeftInput] = useState(
    initialLeftHash ? normalizeHash(initialLeftHash) : "",
  );
  const [leftFile, setLeftFile] = useState<File | null>(null);
  const [leftFileHash, setLeftFileHash] = useState<string | null>(null);
  const [leftHashing, setLeftHashing] = useState(false);

  const [rightInput, setRightInput] = useState("");
  const [rightFile, setRightFile] = useState<File | null>(null);
  const [rightFileHash, setRightFileHash] = useState<string | null>(null);
  const [rightHashing, setRightHashing] = useState(false);

  // Keep the locked/pre-filled left hash in sync if it changes.
  useEffect(() => {
    if (initialLeftHash !== undefined) {
      setLeftInput(normalizeHash(initialLeftHash));
    }
  }, [initialLeftHash]);

  const onLeftFile = useCallback((file: File) => {
    setLeftFile(file);
    setLeftFileHash(null);
    setLeftHashing(true);
    hashFile(file)
      .then((h) => setLeftFileHash(h))
      .catch(() => setLeftFileHash(null))
      .finally(() => setLeftHashing(false));
  }, []);

  const onRightFile = useCallback((file: File) => {
    setRightFile(file);
    setRightFileHash(null);
    setRightHashing(true);
    hashFile(file)
      .then((h) => setRightFileHash(h))
      .catch(() => setRightFileHash(null))
      .finally(() => setRightHashing(false));
  }, []);

  const leftHash =
    leftMode === "file" ? (leftFileHash ?? "") : normalizeHash(leftInput);
  const rightHash =
    rightMode === "file" ? (rightFileHash ?? "") : normalizeHash(rightInput);

  const bothReady = leftHash.length > 0 && rightHash.length > 0;
  const match = bothReady && leftHash === rightHash;

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <SidePanel
          label={leftLabel}
          mode={leftMode}
          lock={lockLeft}
          value={leftInput}
          onChange={setLeftInput}
          file={leftFile}
          fileHash={leftFileHash}
          hashing={leftHashing}
          onFile={onLeftFile}
        />
        <SidePanel
          label={rightLabel}
          mode={rightMode}
          lock={false}
          value={rightInput}
          onChange={setRightInput}
          file={rightFile}
          fileHash={rightFileHash}
          hashing={rightHashing}
          onFile={onRightFile}
        />
      </div>

      {bothReady ? (
        <div
          role="status"
          className={`mt-6 rounded-lg border p-5 ${
            match
              ? "border-green-500/40 bg-green-500/5"
              : "border-red-500/40 bg-red-500/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                match
                  ? "bg-green-500/15 text-green-600 dark:text-green-400"
                  : "bg-red-500/15 text-red-600 dark:text-red-400"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {match ? <path d="M20 6 9 17l-5-5" /> : <path d="M18 6 6 18M6 6l12 12" />}
              </svg>
            </span>
            <p className="text-lg font-medium">
              {match
                ? "Hashes match — this is the same file"
                : "Hashes do not match — files are different"}
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-foreground/50">
                {leftLabel}
              </div>
              <HashDiff value={leftHash} other={rightHash} />
            </div>
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-foreground/50">
                {rightLabel}
              </div>
              <HashDiff value={rightHash} other={leftHash} />
            </div>
          </div>

          {match && showVerifyLink ? (
            <Link
              href={`/v/${leftHash}`}
              className="mt-4 inline-flex items-center rounded-md bg-heading px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Verify this hash on-chain &rarr;
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
