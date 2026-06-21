"use client";

import { useState } from "react";
import {
  formatAuditCsv,
  generateAuditReport,
  getAuditLog,
  localDayEndIso,
  localDayStartIso,
  truncateMiddle,
  type AuditFilters,
  type AuditReport,
} from "@/lib/audit";
import { renderAuditReportHTML } from "@/lib/auditReportRenderer";
import { downloadExport } from "@/lib/export";
import { dispatchAudit } from "@/lib/auditEvents";

const PREVIEW_LIMIT = 200;

function fmt(iso: string): string {
  if (!iso) return "n/a";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AuditReportGenerator() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [report, setReport] = useState<AuditReport | null>(null);

  const generate = () => {
    const filters: AuditFilters = {};
    if (dateFrom) filters.dateFrom = localDayStartIso(dateFrom);
    if (dateTo) filters.dateTo = localDayEndIso(dateTo);
    const generated = generateAuditReport(getAuditLog(filters), {
      from: filters.dateFrom,
      to: filters.dateTo,
    });
    setReport(generated);
    // Record the report's creation after generating it, so the just-shown
    // report does not include its own generation event.
    dispatchAudit("audit_report_generate", "export", null, {
      totalActions: generated.totalActions,
      integrityHash: generated.integrityHash,
      from: generated.period.from,
      to: generated.period.to,
    });
  };

  const downloadJson = () => {
    if (!report) return;
    downloadExport(
      JSON.stringify(report, null, 2),
      `audit-report-${stamp()}.json`,
      "application/json",
    );
  };

  const downloadCsv = () => {
    if (!report) return;
    const esc = (v: string) =>
      /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    // A metadata preamble (period, summary, and the integrity hash) so the CSV
    // stands alone as a compliance artifact, like the JSON and HTML exports.
    const preamble = [
      ["Report ID", report.id],
      ["Generated At", report.generatedAt],
      ["Period From", report.period.from],
      ["Period To", report.period.to],
      ["Total Actions", String(report.totalActions)],
      ["Unique Actors", String(report.uniqueActors)],
      ["Integrity Hash", report.integrityHash],
    ]
      .map(([k, v]) => `${esc(k)},${esc(v)}`)
      .join("\r\n");
    downloadExport(
      `${preamble}\r\n\r\n${formatAuditCsv(report.entries)}`,
      `audit-report-${stamp()}.csv`,
      "text/csv",
    );
  };

  const downloadHtml = () => {
    if (!report) return;
    downloadExport(
      renderAuditReportHTML(report),
      `audit-report-${stamp()}.html`,
      "text/html",
    );
  };

  const breakdown = report
    ? Object.entries(report.actionBreakdown).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <section className="mt-10 rounded-lg border border-foreground/10 bg-card p-6">
      <h2 className="text-lg font-medium">Audit report</h2>
      <p className="mt-1 text-sm text-foreground/60">
        Generate a signed-style compliance report over a period, with an
        integrity hash and the full entry list, exportable as JSON, CSV, or a
        printable HTML document.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-foreground/50">
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-foreground/50">
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-foreground/15 bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={generate}
          className="rounded-md bg-heading px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Generate audit report
        </button>
      </div>

      {report && (
        <div className="mt-6 rounded-lg border border-foreground/10 bg-background p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Report {truncateMiddle(report.id, 8, 6)}</div>
              <div className="text-xs text-foreground/50">
                Generated {fmt(report.generatedAt)}
              </div>
              <div className="text-xs text-foreground/50">
                Period: {fmt(report.period.from)} to {fmt(report.period.to)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadJson}
                className="rounded-md border border-foreground/15 px-3 py-1.5 text-xs hover:border-foreground/40"
              >
                Download JSON
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                className="rounded-md border border-foreground/15 px-3 py-1.5 text-xs hover:border-foreground/40"
              >
                Download CSV
              </button>
              <button
                type="button"
                onClick={downloadHtml}
                className="rounded-md border border-foreground/15 px-3 py-1.5 text-xs hover:border-foreground/40"
              >
                Download HTML
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-foreground/10 p-3">
              <div className="text-[11px] uppercase tracking-wide text-foreground/50">
                Total actions
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {report.totalActions}
              </div>
            </div>
            <div className="rounded-md border border-foreground/10 p-3">
              <div className="text-[11px] uppercase tracking-wide text-foreground/50">
                Unique actors
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {report.uniqueActors}
              </div>
            </div>
            <div className="rounded-md border border-foreground/10 p-3">
              <div className="text-[11px] uppercase tracking-wide text-foreground/50">
                Distinct actions
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {breakdown.length}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/50">
              Action breakdown
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70">
              {breakdown.length === 0 ? (
                <span className="text-foreground/40">No actions in period.</span>
              ) : (
                breakdown.map(([act, count]) => (
                  <span key={act} className="font-mono">
                    {act}: {count}
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 rounded-md border border-foreground/10 bg-card p-3">
            <div className="text-[11px] uppercase tracking-wide text-foreground/50">
              Integrity hash (SHA-256)
            </div>
            <div className="mt-1 break-all font-mono text-xs">
              {report.integrityHash}
            </div>
            <p className="mt-2 text-[11px] text-foreground/50">
              Computed over the id and timestamp of every entry in order. Any
              change to the set or order of entries changes this value.
            </p>
          </div>

          <div className="mt-4">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-foreground/50">
              Entries ({report.entries.length})
            </div>
            <div className="max-h-80 overflow-auto rounded-md border border-foreground/10">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="text-left text-foreground/50">
                    <th className="px-3 py-1.5 font-medium">Timestamp</th>
                    <th className="px-3 py-1.5 font-medium">Action</th>
                    <th className="px-3 py-1.5 font-medium">Actor</th>
                    <th className="px-3 py-1.5 font-medium">Target</th>
                  </tr>
                </thead>
                <tbody>
                  {report.entries.slice(0, PREVIEW_LIMIT).map((e) => (
                    <tr
                      key={e.id}
                      className="border-t border-foreground/5 text-foreground/70"
                    >
                      <td className="whitespace-nowrap px-3 py-1.5">
                        {fmt(e.timestamp)}
                      </td>
                      <td className="px-3 py-1.5 font-mono">{e.action}</td>
                      <td className="px-3 py-1.5 font-mono">
                        {e.actor ? truncateMiddle(e.actor) : "n/a"}
                      </td>
                      <td className="px-3 py-1.5 font-mono">
                        {e.target ? truncateMiddle(e.target) : "n/a"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.entries.length > PREVIEW_LIMIT && (
              <p className="mt-1 text-[11px] text-foreground/40">
                Showing the first {PREVIEW_LIMIT} of {report.entries.length}.
                The full set is included in every export.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
