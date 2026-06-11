import { after } from "next/server";
import { fetchProtocolStats } from "@/lib/stats";
import { processPendingWebhooks } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function GET() {
  // Opportunistically advance any registered tx webhooks. Scheduled with after()
  // so the Hiro lookups and outbound POSTs run as platform-managed background
  // work that survives past the response, rather than a bare floating promise
  // the runtime may freeze. It self-skips when nothing is pending.
  after(processPendingWebhooks);

  try {
    const stats = await fetchProtocolStats();
    return Response.json(stats, {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  } catch {
    return Response.json(
      { error: "Could not load protocol stats." },
      { status: 502 },
    );
  }
}
