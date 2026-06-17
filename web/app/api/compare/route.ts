import { compareAnchors, HEX_64 } from "@/lib/compare";
import { corsHeaders } from "@/lib/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400, headers: corsHeaders() });
}

function pickOwner(value: string | null): string | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return STX_PRINCIPAL.test(upper) ? upper : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const a = (url.searchParams.get("a") ?? "").toLowerCase();
  const b = (url.searchParams.get("b") ?? "").toLowerCase();

  if (!HEX_64.test(a) || !HEX_64.test(b)) {
    return badRequest(
      "Provide two 64 hex character hashes as ?a= and ?b=.",
    );
  }

  const ownerA = pickOwner(url.searchParams.get("ownerA"));
  const ownerB = pickOwner(url.searchParams.get("ownerB"));

  try {
    const comparison = await compareAnchors(a, b, ownerA, ownerB);
    return Response.json(comparison, {
      headers: corsHeaders({ "Cache-Control": "public, s-maxage=120" }),
    });
  } catch {
    return Response.json(
      { error: "Could not compare the documents. Please try again." },
      { status: 502, headers: corsHeaders() },
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
