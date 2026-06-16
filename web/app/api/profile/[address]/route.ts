import { corsHeaders } from "@/lib/verify";
import { fetchWalletProfile, isValidProfileAddress } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ address: string }>;
};

export async function GET(_req: Request, { params }: RouteContext) {
  const { address: raw } = await params;
  const address = (raw ?? "").trim().toUpperCase();

  if (!isValidProfileAddress(address)) {
    return Response.json(
      { error: "Invalid Stacks address. Provide a mainnet (SP) or testnet (ST) principal." },
      { status: 400, headers: corsHeaders() },
    );
  }

  try {
    const profile = await fetchWalletProfile(address);
    return Response.json(profile, {
      headers: corsHeaders({ "Cache-Control": "public, s-maxage=300" }),
    });
  } catch {
    return Response.json(
      { error: "Could not load profile. Please try again." },
      { status: 502, headers: corsHeaders() },
    );
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
