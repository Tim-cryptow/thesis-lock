import { corsHeaders } from "@/lib/verify";
import { activityCategory, fetchActivityLog, type ActivityCategory } from "@/lib/activityLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES: ActivityCategory[] = ["anchors", "groups", "proofs", "registry"];

const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

function parseIntParam(raw: string | null, fallback: number): number {
  // An omitted param must fall back, not coerce: Number(null) is 0, which would
  // otherwise clamp the page size down to a single transaction window.
  if (raw === null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = (url.searchParams.get("address") ?? "").trim().toUpperCase();
  const page = parseIntParam(url.searchParams.get("page"), 0);
  const limit = parseIntParam(url.searchParams.get("limit"), 20);
  const rawType = url.searchParams.get("type");

  if (!STX_PRINCIPAL.test(address)) {
    return Response.json(
      { error: "Missing or invalid address. Provide ?address=<principal>." },
      { status: 400, headers: corsHeaders() },
    );
  }

  const category = CATEGORIES.includes(rawType as ActivityCategory)
    ? (rawType as ActivityCategory)
    : null;

  try {
    const result = await fetchActivityLog(address, page, limit);
    const events = category
      ? result.events.filter((e) => activityCategory(e.type) === category)
      : result.events;
    return Response.json(
      { events, total: result.total, hasMore: result.hasMore },
      { headers: corsHeaders({ "Cache-Control": "public, s-maxage=60" }) },
    );
  } catch {
    return Response.json(
      { error: "Could not load activity. Please try again." },
      { status: 502, headers: corsHeaders() },
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
