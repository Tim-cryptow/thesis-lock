import type { ReportData, ReportEntry } from "./report";

const SITE_URL = "https://thesis-lock.vercel.app";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Prefer the exact verify path captured at generation time: it pins batch
// anchors to their owner and group anchors to their { group, index }, so the
// link always resolves to the precise row the entry describes. Fall back to a
// bare hash link (with owner for batch) when no exact path is available, such
// as a proof-only match.
export function verifyUrlFor(entry: ReportEntry): string {
  if (entry.verifyUrl) {
    return entry.verifyUrl.startsWith("http")
      ? entry.verifyUrl
      : `${SITE_URL}${entry.verifyUrl}`;
  }
  const base = `${SITE_URL}/v/${entry.hash}`;
  if (entry.source === "batch" && entry.owner) {
    return `${base}?owner=${entry.owner}`;
  }
  return base;
}

const SOURCE_LABELS: Record<string, string> = {
  single: "Single anchor",
  batch: "Batch anchor",
  group: "Group anchor",
  registry: "Registry",
  proof: "Proof NFT",
};

function sourceLabel(source: string | null): string {
  if (!source) return "Not found";
  return SOURCE_LABELS[source] ?? source;
}

// Renders the template-parsed label as a compact "key: value" string, falling
// back to the raw label when it has no structure.
function formatLabel(entry: ReportEntry): string {
  if (!entry.label) return "(none)";
  const fields = entry.template?.fields;
  if (fields) {
    const parts = Object.entries(fields)
      .filter(([key]) => key !== "label")
      .map(([key, value]) => `${key}: ${value}`);
    if (parts.length > 0) return parts.join(", ");
  }
  return entry.label;
}

function summaryRows(data: ReportData): string {
  const { summary } = data;
  const sourceRows = Object.entries(summary.sources)
    .map(
      ([source, count]) =>
        `<tr><td>${escapeHtml(sourceLabel(source))}</td><td class="num">${count}</td></tr>`,
    )
    .join("");
  return `
      <tr><td>Total documents</td><td class="num">${summary.total}</td></tr>
      <tr><td>Verified on chain</td><td class="num">${summary.verified}</td></tr>
      <tr><td>Not found</td><td class="num">${summary.notFound}</td></tr>
      ${sourceRows}`;
}

function entrySection(entry: ReportEntry, index: number): string {
  const status = entry.verified
    ? `<span class="badge badge-ok">Verified</span>`
    : `<span class="badge badge-no">Not found</span>`;
  const verifyUrl = escapeHtml(verifyUrlFor(entry));
  const filename = entry.filename
    ? `<div class="field"><span class="label">Filename</span><div class="value">${escapeHtml(entry.filename)}</div></div>`
    : "";
  const meta = entry.verified
    ? `
      <div class="row">
        <div class="field"><span class="label">Source</span><div class="value">${escapeHtml(sourceLabel(entry.source))}</div></div>
        <div class="field"><span class="label">Stacks Block</span><div class="value mono">${entry.block ?? "-"}</div></div>
      </div>
      <div class="field"><span class="label">Label</span><div class="value">${escapeHtml(formatLabel(entry))}</div></div>
      <div class="field"><span class="label">Owner</span><div class="value mono">${escapeHtml(entry.owner ?? "-")}</div></div>
      <div class="field"><span class="label">Proof NFT</span><div class="value mono">${entry.proofNFT !== null ? `#${entry.proofNFT}` : "None"}</div></div>`
    : "";
  return `
    <section class="entry">
      <div class="entry-head">
        <span class="entry-num">${index + 1}</span>
        ${status}
      </div>
      <div class="field"><span class="label">Document Hash (SHA-256)</span><div class="value mono break">${escapeHtml(entry.hash)}</div></div>
      ${filename}
      ${meta}
      <div class="verify"><span class="label">Verify</span> <a href="${verifyUrl}">${verifyUrl}</a></div>
    </section>`;
}

function tocRows(data: ReportData): string {
  return data.hashes
    .map((entry, i) => {
      const name = entry.filename
        ? escapeHtml(entry.filename)
        : `${escapeHtml(entry.hash.slice(0, 16))}...`;
      const status = entry.verified ? "Verified" : "Not found";
      return `<li><span class="toc-num">${i + 1}.</span> <span class="toc-name">${name}</span> <span class="toc-status ${entry.verified ? "ok" : "no"}">${status}</span></li>`;
    })
    .join("");
}

// A self-contained, printable HTML document. All CSS is inline so the file can
// be saved or emailed as a single artifact, and the print rules drop background
// colors and break entries onto fresh pages.
export function renderReportHTML(data: ReportData): string {
  const title = escapeHtml(data.title || "Verification Report");
  const generatedAt = escapeHtml(new Date(data.generatedAt).toUTCString());
  const generatedBy = data.generatedBy
    ? escapeHtml(data.generatedBy)
    : "Anonymous";
  const headline = `${data.summary.verified} of ${data.summary.total} documents verified on the Stacks blockchain`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title} | ThesisLock</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *,*::before,*::after{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{
    background:#f4f4f5;color:#18181b;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    line-height:1.5;padding:40px 16px;
  }
  .sheet{max-width:820px;margin:0 auto;background:#fff;border:1px solid #d4d4d8;border-radius:8px;overflow:hidden}
  .header{background:#0a0a0a;color:#fafafa;padding:32px 40px;border-bottom:4px solid #f59e0b}
  .header h1{margin:0 0 6px;font-size:24px;font-weight:600}
  .header p{margin:0;font-size:13px;color:#a1a1aa}
  .body{padding:32px 40px}
  h2{font-size:16px;margin:32px 0 12px;padding-bottom:6px;border-bottom:1px solid #e4e4e7}
  .executive{font-size:18px;font-weight:600;margin:0 0 8px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  td{padding:8px 0;border-bottom:1px solid #f0f0f1}
  td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
  ol.toc{list-style:none;padding:0;margin:0;font-size:13px}
  ol.toc li{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f4f4f5}
  .toc-num{color:#a1a1aa;width:28px}
  .toc-name{flex:1;font-family:ui-monospace,Menlo,Monaco,Consolas,monospace}
  .toc-status{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
  .toc-status.ok{color:#15803d}
  .toc-status.no{color:#b91c1c}
  .entry{margin-top:24px;padding:20px;border:1px solid #e4e4e7;border-radius:6px;background:#fafafa}
  .entry-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}
  .entry-num{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:#18181b;color:#fafafa;font-size:12px;font-weight:600}
  .badge{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;padding:3px 8px;border-radius:4px}
  .badge-ok{background:#dcfce7;color:#15803d}
  .badge-no{background:#fee2e2;color:#b91c1c}
  .field{margin-bottom:12px}
  .field:last-child{margin-bottom:0}
  .label{display:block;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
  .value{font-size:14px;color:#18181b}
  .mono{font-family:ui-monospace,Menlo,Monaco,Consolas,monospace;font-size:13px}
  .break{word-break:break-all}
  .row{display:flex;gap:32px;flex-wrap:wrap}
  .row .field{flex:1 1 180px}
  .verify{margin-top:12px;font-size:13px}
  .verify a{color:#2563eb;text-decoration:underline;word-break:break-all}
  .footer{padding:20px 40px;background:#fafafa;border-top:1px solid #e4e4e7;font-size:11px;color:#71717a;text-align:center;line-height:1.6}
  .footer a{color:#52525b;text-decoration:none}
  @media print{
    body{background:#fff;padding:0}
    .sheet{border:none;border-radius:0}
    .entry{background:#fff;break-inside:avoid;page-break-inside:avoid}
    .header{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    h2{page-break-after:avoid}
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <h1>ThesisLock Verification Report</h1>
      <p>Generated ${generatedAt} &middot; By ${generatedBy}</p>
    </div>
    <div class="body">
      <p class="executive">${escapeHtml(headline)}</p>
      <p style="margin:0;color:#52525b;font-size:14px">${title}</p>

      <h2>Summary</h2>
      <table>${summaryRows(data)}</table>

      <h2>Contents</h2>
      <ol class="toc">${tocRows(data)}</ol>

      <h2>Verification Details</h2>
      ${data.hashes.map((entry, i) => entrySection(entry, i)).join("")}
    </div>
    <div class="footer">
      Generated by ThesisLock
      (<a href="${SITE_URL}">thesis-lock.vercel.app</a>).
      All verifications are independently reproducible against the Stacks blockchain.
    </div>
  </div>
</body>
</html>`;
}

export function renderReportJSON(data: ReportData): string {
  return JSON.stringify(data, null, 2);
}

function csvCell(value: string | number | boolean | null): string {
  const text = value === null ? "" : String(value);
  // Quote when the cell contains a delimiter, quote, or newline; double any
  // embedded quotes per RFC 4180.
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function renderReportCSV(data: ReportData): string {
  const headers = [
    "Hash",
    "Filename",
    "Verified",
    "Source",
    "Label",
    "Owner",
    "Block",
    "Proof NFT",
  ];
  const rows = data.hashes.map((entry) =>
    [
      entry.hash,
      entry.filename ?? "",
      entry.verified ? "yes" : "no",
      entry.source ?? "",
      entry.label ?? "",
      entry.owner ?? "",
      entry.block ?? "",
      entry.proofNFT ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [headers.map(csvCell).join(","), ...rows].join("\r\n");
}
