import { callReadOnly, getContract } from "@/lib/contractExplorer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ contract: string }>;
};

// JSON body may include bigints (cvToValue decodes uints as bigint); Response.json
// would throw on them, so serialize manually with a bigint-aware replacer.
function jsonResponse(body: unknown, init?: ResponseInit): Response {
  const text = JSON.stringify(body, (_k, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
  return new Response(text, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
}

// GET /api/explorer/<contract-name>/call?fn=<function>&args=<json-encoded-args>
// Proxies a read-only call to the Hiro API and returns the decoded result.
export async function GET(req: Request, { params }: RouteContext) {
  const { contract: name } = await params;
  const contract = getContract(name);
  if (!contract) {
    return jsonResponse({ error: `Unknown contract: ${name}` }, { status: 404 });
  }

  const url = new URL(req.url);
  const fn = url.searchParams.get("fn");
  if (!fn) {
    return jsonResponse(
      { error: "Missing required query parameter: fn" },
      { status: 400 },
    );
  }

  let args: unknown[];
  try {
    const parsed: unknown = JSON.parse(url.searchParams.get("args") ?? "[]");
    if (!Array.isArray(parsed)) throw new Error("args must be a JSON array");
    args = parsed;
  } catch {
    return jsonResponse(
      { error: "Invalid args: expected a JSON-encoded array" },
      { status: 400 },
    );
  }

  try {
    const result = await callReadOnly(name, fn, args);
    return jsonResponse(result, {
      headers: { "Cache-Control": "public, s-maxage=120" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Read-only call failed";
    // Upstream node failures are 502; everything else is a bad request.
    const status = message.startsWith("Hiro API returned") ? 502 : 400;
    return jsonResponse({ error: message }, { status });
  }
}
