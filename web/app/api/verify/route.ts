import { createHash } from "node:crypto";
import { corsHeaders, HEX_64, verifyHash } from "@/lib/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function badRequest(error: string): Response {
  return Response.json(
    { verified: false, error },
    { status: 400, headers: corsHeaders() },
  );
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  let hash: string | undefined;
  let owner: string | undefined;
  let computedHash: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return badRequest("Expected a 'file' field in the form data.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    computedHash = createHash("sha256").update(bytes).digest("hex");
    hash = computedHash;
    const ownerField = form.get("owner");
    owner = typeof ownerField === "string" ? ownerField : undefined;
  } else {
    let body: { hash?: unknown; owner?: unknown };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body.");
    }
    hash = typeof body.hash === "string" ? body.hash : undefined;
    owner = typeof body.owner === "string" ? body.owner : undefined;
  }

  const normalized = (hash ?? "").toLowerCase();
  if (!HEX_64.test(normalized)) {
    return badRequest("Invalid hash. Expected 64 hex characters.");
  }

  const url = new URL(req.url);
  const result = await verifyHash(normalized, owner, url.origin);
  const payload = computedHash ? { ...result, computedHash } : result;

  return Response.json(payload, { headers: corsHeaders() });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
