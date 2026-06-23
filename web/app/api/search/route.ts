import { after } from "next/server";
import { corsHeaders } from "@/lib/verify";
import { runSearch, type SearchType } from "@/lib/search";
import { validateHash, validateAddress } from "@/lib/validators";
import { processPendingWebhooks } from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: SearchType[] = ["auto", "hash", "principal", "label"];

function parseType(raw: string | null): SearchType {
  return TYPES.includes(raw as SearchType) ? (raw as SearchType) : "auto";
}

export async function GET(req: Request) {
  // Opportunistically advance any registered tx webhooks as background work,
  // matching the other read routes.
  after(processPendingWebhooks);

  const url = new URL(req.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const type = parseType(url.searchParams.get("type"));
  const owner = url.searchParams.get("owner") ?? undefined;

  if (!query) {
    return Response.json(
      { error: "Missing query. Provide ?q=<hash|principal|label>." },
      { status: 400, headers: corsHeaders() },
    );
  }

  // When the caller fixes the type, validate the query matches that format.
  if (type === "hash") {
    const check = validateHash(query);
    if (!check.valid) {
      return Response.json(
        { error: check.error },
        { status: 400, headers: corsHeaders() },
      );
    }
  } else if (type === "principal") {
    const check = validateAddress(query);
    if (!check.valid) {
      return Response.json(
        { error: check.error },
        { status: 400, headers: corsHeaders() },
      );
    }
  }

  try {
    const results = await runSearch(query, type, owner);
    return Response.json(results, {
      headers: corsHeaders({ "Cache-Control": "public, s-maxage=30" }),
    });
  } catch {
    return Response.json(
      { error: "Search failed. Please try again." },
      { status: 502, headers: corsHeaders() },
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
