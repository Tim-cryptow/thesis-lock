import { fetchProtocolStats } from "@/lib/stats";
import { processPendingWebhooks } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function GET() {
  // Opportunistically advance any registered tx webhooks. Fire-and-forget so it
  // never blocks the stats response; it self-skips when nothing is pending.
  void processPendingWebhooks();

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
