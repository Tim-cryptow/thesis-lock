"use client";

import { useEffect, useState } from "react";
import { formatBytes } from "@/lib/format";
import CopyButton from "@/app/components/CopyButton";

type FilePreviewProps = {
  file: File;
  hash: string | null;
  hashing: boolean;
  // Compact layout for list rows: smaller thumbnail and fewer details.
  compact?: boolean;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function isImage(file: File): boolean {
  return IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|gif|webp)$/i.test(file.name);
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function extensionOf(name: string): string {
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toUpperCase() : "FILE";
}

function formatModified(ms: number): string {
  if (!ms) return "Unknown";
  try {
    return new Date(ms).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Unknown";
  }
}

// Best-effort PDF page count. Reads the file text (capped, to avoid loading huge
// files into memory) and looks for the page tree /Count, falling back to a tally
// of page objects. Returns null when nothing reliable is found.
async function detectPdfPages(file: File): Promise<number | null> {
  if (file.size > 10 * 1024 * 1024) return null;
  try {
    const text = await file.text();
    const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
    if (counts.length > 0) return Math.max(...counts);
    const pages = text.match(/\/Type\s*\/Page(?![a-z])/gi);
    return pages ? pages.length : null;
  } catch {
    return null;
  }
}

function FileGlyph({ pdf, className }: { pdf: boolean; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      {pdf ? <path d="M8 13h8M8 17h5" /> : <path d="M9 13h6M9 17h4" />}
    </svg>
  );
}

function Spinner({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`animate-spin ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.22-8.56" strokeLinecap="round" />
    </svg>
  );
}

// Shows what was dropped: a thumbnail for images, a PDF or generic file icon
// otherwise, the core file metadata, and the computed hash (or a progress
// indicator while it is being computed).
export default function FilePreview({ file, hash, hashing, compact = false }: FilePreviewProps) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [pdfPages, setPdfPages] = useState<number | null>(null);

  const image = isImage(file);
  const pdf = isPdf(file);

  useEffect(() => {
    if (!image) {
      setThumbUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, image]);

  useEffect(() => {
    if (!pdf) {
      setPdfPages(null);
      return;
    }
    let cancelled = false;
    void detectPdfPages(file).then((n) => {
      if (!cancelled) setPdfPages(n);
    });
    return () => {
      cancelled = true;
    };
  }, [file, pdf]);

  const thumbBox = compact ? "h-10 w-10" : "h-16 w-16";
  const glyphSize = compact ? "h-5 w-5" : "h-7 w-7";

  const thumbnail =
    image && thumbUrl ? (
      <img
        src={thumbUrl}
        alt=""
        className={`${thumbBox} shrink-0 rounded border border-foreground/10 object-cover`}
      />
    ) : (
      <div
        className={`${thumbBox} flex shrink-0 items-center justify-center rounded border border-foreground/10 bg-foreground/5 ${
          pdf ? "text-red-500/80" : "text-foreground/45"
        }`}
      >
        <FileGlyph pdf={pdf} className={glyphSize} />
      </div>
    );

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {thumbnail}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium" title={file.name}>
            {file.name}
          </div>
          <div className="text-xs text-foreground/50">{formatBytes(file.size)}</div>
          {hashing ? (
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-foreground/50">
              <Spinner className="h-3 w-3" />
              Computing hash...
            </div>
          ) : hash ? (
            <div className="mt-1 flex items-center gap-1.5">
              <code className="font-mono text-xs text-foreground/65">
                {hash.slice(0, 16)}...{hash.slice(-8)}
              </code>
              <CopyButton value={hash} label="document hash" size="sm" />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-foreground/10 bg-card p-4">
      <div className="flex items-start gap-4">
        {thumbnail}
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium" title={file.name}>
            {file.name}
          </div>
          <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-foreground/55">
            <div>
              <dt className="sr-only">Size</dt>
              <dd>{formatBytes(file.size)}</dd>
            </div>
            <div>
              <dt className="sr-only">Type</dt>
              <dd>{file.type || extensionOf(file.name)}</dd>
            </div>
            {pdf && pdfPages ? (
              <div>
                <dt className="sr-only">Pages</dt>
                <dd>
                  {pdfPages} {pdfPages === 1 ? "page" : "pages"}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="sr-only">Modified</dt>
              <dd>Modified {formatModified(file.lastModified)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-4" role="region" aria-label="Document hash" aria-busy={hashing}>
        <div className="mb-1 text-xs uppercase tracking-wide text-foreground/50">SHA-256</div>
        {hashing ? (
          <div className="inline-flex items-center gap-2 text-sm text-foreground/50">
            <Spinner className="h-4 w-4" />
            Computing hash...
          </div>
        ) : hash ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-foreground/5 px-3 py-2 font-mono text-xs md:text-sm">
              {hash}
            </code>
            <CopyButton value={hash} label="document hash" />
          </div>
        ) : (
          <p className="text-sm text-foreground/40">Not computed yet.</p>
        )}
      </div>
    </div>
  );
}
