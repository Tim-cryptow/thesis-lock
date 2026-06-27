import { fetchContractCalls, fetchContractCallCount, getContract } from "@/lib/contractExplorer";
import { corsHeaders } from "@/lib/verify";

export const runtime = "nodejs";
// We serve our own CDN cache headers below rather than relying on route caching.
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ contract: string }>;
};

// GET /api/explorer/<contract-name>
// Returns the static contract metadata (with a live total call count) and the
// most recent contract calls.
export async function GET(_req: Request, { params }: RouteContext) {
  const { contract: name } = await params;
  const contract = getContract(name);
  if (!contract) {
    return Response.json(
      { error: `Unknown contract: ${name}` },
      { status: 404, headers: corsHeaders() },
    );
  }

  try {
    const [recentCalls, totalCalls] = await Promise.all([
      fetchContractCalls(name, 20),
      fetchContractCallCount(name),
    ]);
    return Response.json(
      { contract: { ...contract, totalCalls }, recentCalls },
      { headers: corsHeaders({ "Cache-Control": "public, s-maxage=120" }) },
    );
  } catch {
    return Response.json(
      { error: "Could not load contract data." },
      { status: 502, headers: corsHeaders() },
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
