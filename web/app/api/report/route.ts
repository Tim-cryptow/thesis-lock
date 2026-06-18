import { corsHeaders } from "@/lib/verify";
import {
  generateReport,
  MAX_REPORT_HASHES,
  type HashInput,
} from "@/lib/report";
import {
  renderReportCSV,
  renderReportHTML,
  renderReportJSON,
} from "@/lib/reportRenderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReportRequest = {
  hashes?: unknown;
  owner?: unknown;
};

function parseHashes(raw: unknown): HashInput[] | null {
  if (!Array.isArray(raw)) return null;
  const out: HashInput[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push({ hash: item });
      continue;
    }
    if (item && typeof item === "object" && typeof (item as { hash?: unknown }).hash === "string") {
      const { hash, filename } = item as { hash: string; filename?: unknown };
      out.push({
        hash,
        ...(typeof filename === "string" ? { filename } : {}),
      });
      continue;
    }
    return null;
  }
  return out;
}

export async function POST(req: Request) {
  let body: ReportRequest;
  try {
    body = (await req.json()) as ReportRequest;
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400, headers: corsHeaders() },
    );
  }

  const hashes = parseHashes(body.hashes);
  if (!hashes || hashes.length === 0) {
    return Response.json(
      { error: "Provide a non-empty 'hashes' array of strings or { hash, filename }." },
      { status: 400, headers: corsHeaders() },
    );
  }
  if (hashes.length > MAX_REPORT_HASHES) {
    return Response.json(
      { error: `Too many hashes. The limit is ${MAX_REPORT_HASHES} per request.` },
      { status: 400, headers: corsHeaders() },
    );
  }

  const owner = typeof body.owner === "string" ? body.owner : undefined;
  const format = (new URL(req.url).searchParams.get("format") ?? "json").toLowerCase();

  let data;
  try {
    data = await generateReport(hashes, owner);
  } catch {
    return Response.json(
      { error: "Report generation failed. Please try again." },
      { status: 502, headers: corsHeaders() },
    );
  }

  // Reports are per-request snapshots of chain state, so they are never cached.
  if (format === "html") {
    return new Response(renderReportHTML(data), {
      headers: corsHeaders({
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      }),
    });
  }
  if (format === "csv") {
    return new Response(renderReportCSV(data), {
      headers: corsHeaders({
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
      }),
    });
  }

  return new Response(renderReportJSON(data), {
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    }),
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
