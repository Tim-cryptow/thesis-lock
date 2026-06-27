import { fetchWalletAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

// c32-encoded Stacks principals are variable length: hash160 leading zero
// bytes are stripped during encoding, so valid addresses run well under the
// typical 41 chars.
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = (url.searchParams.get("address") ?? "").trim().toUpperCase();

  if (!STX_PRINCIPAL.test(address)) {
    return Response.json(
      { error: "Provide a valid Stacks principal as ?address=." },
      { status: 400 },
    );
  }

  try {
    const analytics = await fetchWalletAnalytics(address);
    return Response.json(analytics, {
      headers: { "Cache-Control": "public, s-maxage=120" },
    });
  } catch {
    return Response.json({ error: "Could not load wallet analytics." }, { status: 502 });
  }
}
