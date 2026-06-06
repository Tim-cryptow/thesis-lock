import { corsHeaders, HEX_64, verifyHash } from "@/lib/verify";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ hash: string }>;
};

export async function GET(req: Request, { params }: RouteContext) {
  const { hash: raw } = await params;
  const hash = (raw ?? "").toLowerCase();

  if (!HEX_64.test(hash)) {
    return Response.json(
      { verified: false, error: "Invalid hash. Expected 64 hex characters." },
      { status: 400, headers: corsHeaders() },
    );
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  if (format !== "json") {
    return Response.json(
      { verified: false, error: "Unsupported format. Only 'json' is supported." },
      { status: 400, headers: corsHeaders() },
    );
  }

  const owner = url.searchParams.get("owner") ?? undefined;
  const result = await verifyHash(hash, owner, url.origin);

  return Response.json(result, {
    headers: corsHeaders({ "Cache-Control": "public, s-maxage=60" }),
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
