import { fetchProtocolStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
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
