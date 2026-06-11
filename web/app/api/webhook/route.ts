import { isSafeWebhookUrl, isValidTxId, registerWebhook } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

// EXPERIMENTAL / BETA. Register a webhook URL to be POSTed when a transaction
// confirms. State is in-memory and per-instance; see lib/webhooks.ts.
export async function POST(request: Request) {
  let body: { url?: unknown; txId?: unknown };
  try {
    body = (await request.json()) as { url?: unknown; txId?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url : "";
  const txId = typeof body.txId === "string" ? body.txId : "";

  if (!isValidTxId(txId)) {
    return Response.json(
      { error: "txId must be a 32-byte hex transaction id." },
      { status: 400 },
    );
  }
  if (!isSafeWebhookUrl(url)) {
    return Response.json(
      { error: "url must be a public https endpoint." },
      { status: 400 },
    );
  }

  if (!registerWebhook(url, txId)) {
    return Response.json(
      { error: "Could not register webhook (registry full)." },
      { status: 429 },
    );
  }

  return Response.json({ registered: true, txId });
}
