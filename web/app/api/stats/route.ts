import { fetchProtocolStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await fetchProtocolStats();
  return Response.json(stats, {
    headers: { "Cache-Control": "public, s-maxage=300" },
  });
}
