"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReportData } from "@/lib/report";
import {
  renderReportCSV,
  renderReportHTML,
  renderReportJSON,
} from "@/lib/reportRenderer";
import SaveToCollectionButton from "@/app/components/SaveToCollectionButton";

// Same Blob + object URL pattern as downloadCertificate: build the file in the
// browser, click a temporary anchor, then revoke the URL.
function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Print without navigating away: render the printable HTML into a hidden iframe
// and drive its own print dialog, so the print-optimized CSS applies.
function printHTML(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  window.setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 250);
}

// Query-string sharing only works for modest lists; very long hash sets blow
// past safe URL lengths, so the share button reports that instead of producing
// a link that some servers and clients will truncate.
const MAX_SHARE_URL = 1900;

export default function ReportActions({
  data,
  onExport,
}: {
  data: ReportData;
  onExport?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const datePart = useMemo(() => {
    try {
      return new Date(data.generatedAt).toISOString().slice(0, 10);
    } catch {
      return "report";
    }
  }, [data.generatedAt]);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    const hashes = data.hashes.map((h) => h.hash).join(",");
    const params = new URLSearchParams({ hashes });
    if (data.title) params.set("title", data.title);
    const url = `${window.location.origin}/report?${params.toString()}`;
    return url.length <= MAX_SHARE_URL ? url : null;
  }, [data]);

  const onShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }, [shareUrl]);

  const buttonClass =
    "rounded-md border border-foreground/15 px-3 py-2 text-sm hover:border-foreground/40 transition";

  return (
    <section className="mt-6" aria-label="Report actions">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            download(
              `thesislock-report-${datePart}.html`,
              renderReportHTML(data),
              "text/html;charset=utf-8",
            );
            onExport?.();
          }}
        >
          Download HTML
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            download(
              `thesislock-report-${datePart}.json`,
              renderReportJSON(data),
              "application/json;charset=utf-8",
            );
            onExport?.();
          }}
        >
          Download JSON
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            download(
              `thesislock-report-${datePart}.csv`,
              renderReportCSV(data),
              "text/csv;charset=utf-8",
            );
            onExport?.();
          }}
        >
          Download CSV
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            printHTML(renderReportHTML(data));
            onExport?.();
          }}
        >
          Print
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={onShare}
          disabled={!shareUrl}
          title={
            shareUrl
              ? "Copy a shareable link to this report"
              : "Too many hashes to encode in a shareable link"
          }
        >
          {copied ? "Link copied!" : "Share"}
        </button>
        <SaveToCollectionButton
          triggerLabel="Save to collection"
          items={data.hashes.map((h) => ({
            hash: h.hash,
            label: h.label ?? h.filename ?? "",
            verifyUrl: h.verifyUrl,
          }))}
        />
      </div>
      {!shareUrl ? (
        <p className="mt-2 text-xs text-foreground/50">
          This report has too many hashes to share as a link. Use a download
          instead.
        </p>
      ) : null}
    </section>
  );
}
