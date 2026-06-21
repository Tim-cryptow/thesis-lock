import type { AuditReport } from "./audit";

// Renders an audit report as a self-contained, printable HTML document. All CSS
// is inline so the file can be saved or emailed as a single artifact, matching
// the look of the verification reports.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(iso: string): string {
  if (!iso) return "n/a";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toUTCString();
}

function breakdownRows(breakdown: Record<string, number>): string {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return `<tr><td>No actions in period</td><td class="num">0</td></tr>`;
  }
  return entries
    .map(
      ([action, count]) =>
        `<tr><td>${escapeHtml(action)}</td><td class="num">${count}</td></tr>`,
    )
    .join("");
}

function entryRows(report: AuditReport): string {
  return report.entries
    .map((e, i) => {
      const meta = JSON.stringify(e.metadata);
      // A detail row carries every remaining hashed field, so the report shows
      // all fields the integrity digest covers and a recipient can recompute it.
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="mono">${escapeHtml(fmt(e.timestamp))}</td>
        <td>${escapeHtml(e.action)}</td>
        <td>${escapeHtml(e.category)}</td>
        <td class="mono break">${escapeHtml(e.actor ?? "n/a")}</td>
        <td class="mono break">${escapeHtml(e.target ?? "n/a")}</td>
      </tr>
      <tr class="detail">
        <td></td>
        <td colspan="5" class="detail-cell">
          <span class="dk">id</span> <span class="mono break">${escapeHtml(e.id)}</span>
          <span class="dk">session</span> <span class="mono break">${escapeHtml(e.sessionId)}</span>
          <span class="dk">ipHash</span> <span class="mono">${escapeHtml(e.ipHash ?? "null")}</span>
          <div><span class="dk">user agent</span> <span class="mono break">${escapeHtml(e.userAgent || "n/a")}</span></div>
          <div><span class="dk">metadata</span> <span class="mono break">${escapeHtml(meta)}</span></div>
        </td>
      </tr>`;
    })
    .join("");
}

export function renderAuditReportHTML(report: AuditReport): string {
  const generatedAt = escapeHtml(fmt(report.generatedAt));
  const periodFrom = escapeHtml(fmt(report.period.from));
  const periodTo = escapeHtml(fmt(report.period.to));
  const reportId = escapeHtml(report.id);
  const integrity = escapeHtml(report.integrityHash);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Audit Report | ThesisLock</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    background:#f4f4f5;color:#18181b;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    line-height:1.5;padding:40px 16px;
  }
  .sheet{max-width:900px;margin:0 auto;background:#fff;border:1px solid #d4d4d8;border-radius:8px;overflow:hidden}
  .header{background:#0a0a0a;color:#fafafa;padding:32px 40px;border-bottom:4px solid #f59e0b}
  .header h1{margin:0 0 6px;font-size:24px;font-weight:600}
  .header p{margin:0;font-size:13px;color:#a1a1aa}
  .body{padding:32px 40px}
  h2{font-size:16px;margin:32px 0 12px;padding-bottom:6px;border-bottom:1px solid #e4e4e7}
  .executive{font-size:18px;font-weight:600;margin:0 0 8px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#71717a;border-bottom:1px solid #e4e4e7;padding:8px 8px 8px 0}
  td{padding:8px 8px 8px 0;border-bottom:1px solid #f0f0f1;vertical-align:top}
  td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
  .mono{font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;font-size:12px}
  .break{word-break:break-all}
  tr.detail td{border-bottom:1px solid #f0f0f1;padding-top:0;padding-bottom:10px}
  .detail-cell{font-size:11px;color:#52525b}
  .detail-cell>div{margin-top:3px}
  .dk{color:#a1a1aa;text-transform:uppercase;letter-spacing:.03em;font-size:10px;margin:0 4px 0 10px}
  .detail-cell .dk:first-child{margin-left:0}
  .integrity{margin-top:12px;padding:16px;border:1px solid #e4e4e7;border-radius:6px;background:#fafafa}
  .integrity .hash{font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;font-size:12px;word-break:break-all;color:#0a0a0a}
  .note{font-size:12px;color:#52525b;margin:8px 0 0}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:8px 0 0}
  .stat{border:1px solid #e4e4e7;border-radius:6px;padding:14px}
  .stat .label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#71717a}
  .stat .value{font-size:22px;font-weight:600;margin-top:4px;font-variant-numeric:tabular-nums}
  .foot{padding:20px 40px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a}
  @media print{body{background:#fff;padding:0}.sheet{border:0}tr{break-inside:avoid}}
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <h1>Audit Report</h1>
      <p>Generated ${generatedAt} &middot; Report ID ${reportId}</p>
      <p>Period: ${periodFrom} to ${periodTo}</p>
    </div>
    <div class="body">
      <p class="executive">${report.totalActions} actions by ${report.uniqueActors} unique actor(s)</p>

      <h2>Executive summary</h2>
      <div class="grid">
        <div class="stat"><div class="label">Total actions</div><div class="value">${report.totalActions}</div></div>
        <div class="stat"><div class="label">Unique actors</div><div class="value">${report.uniqueActors}</div></div>
        <div class="stat"><div class="label">Distinct actions</div><div class="value">${Object.keys(report.actionBreakdown).length}</div></div>
      </div>

      <h2>Action breakdown</h2>
      <table>
        <thead><tr><th>Action</th><th style="text-align:right">Count</th></tr></thead>
        <tbody>${breakdownRows(report.actionBreakdown)}</tbody>
      </table>

      <h2>Integrity</h2>
      <div class="integrity">
        <div class="hash">${integrity}</div>
        <p class="note">
          This SHA-256 digest is computed over every field of every entry below,
          in order. Each entry's full set of fields is shown, so the digest can
          be recomputed from this report; any addition, removal, reordering, or
          edit changes it, which is what makes this log tamper evident.
        </p>
      </div>

      <h2>Entries (${report.entries.length})</h2>
      <table>
        <thead><tr><th>#</th><th>Timestamp (UTC)</th><th>Action</th><th>Category</th><th>Actor</th><th>Target</th></tr></thead>
        <tbody>${entryRows(report)}</tbody>
      </table>
    </div>
    <div class="foot">
      ThesisLock audit trail. All actions recorded client-side; this report was
      generated in the browser and reflects the local log at generation time.
    </div>
  </div>
</body>
</html>`;
}
