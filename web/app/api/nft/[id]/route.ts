import { corsHeaders } from "@/lib/verify";
import { fetchProof } from "@/lib/hiroAnchor";

export const dynamic = "force-dynamic";

const APP_ORIGIN = "https://thesis-lock.vercel.app";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function proofSvg(tokenId: number, hash: string): string {
  const shortHash = `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">`,
    `<rect width="600" height="600" fill="#0f172a"/>`,
    `<text x="300" y="180" fill="#f8fafc" font-family="monospace" font-size="34" text-anchor="middle">ThesisLock</text>`,
    `<text x="300" y="300" fill="#38bdf8" font-family="monospace" font-size="64" text-anchor="middle">Proof #${tokenId}</text>`,
    `<text x="300" y="400" fill="#94a3b8" font-family="monospace" font-size="22" text-anchor="middle">${shortHash}</text>`,
    `<text x="300" y="470" fill="#64748b" font-family="monospace" font-size="18" text-anchor="middle">Soulbound on Stacks</text>`,
    `</svg>`,
  ].join("");
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const tokenId = Number(id);

  if (!Number.isInteger(tokenId) || tokenId < 1) {
    return Response.json({ error: "Invalid token id." }, { status: 400, headers: corsHeaders() });
  }

  const proof = await fetchProof(tokenId);
  if (!proof) {
    return Response.json({ error: "Token not found." }, { status: 404, headers: corsHeaders() });
  }

  const verifyUrl = `${APP_ORIGIN}/v/${proof.hash}`;
  const image = `data:image/svg+xml;utf8,${encodeURIComponent(proofSvg(tokenId, proof.hash))}`;

  return Response.json(
    {
      name: `ThesisLock Proof #${tokenId}`,
      description:
        "Soulbound proof-of-existence NFT anchoring a SHA-256 document hash on Stacks. Non-transferable.",
      image,
      external_url: verifyUrl,
      attributes: [
        { trait_type: "Hash", value: proof.hash },
        { trait_type: "Label", value: proof.label },
        { trait_type: "Anchored by", value: proof.anchoredBy },
        { trait_type: "Stacks block", value: proof.stacksBlock },
        { trait_type: "Burn block", value: proof.burnBlock },
      ],
    },
    {
      headers: corsHeaders({ "Cache-Control": "public, s-maxage=3600" }),
    },
  );
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
