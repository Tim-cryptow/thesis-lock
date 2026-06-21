import { checkAllServices, getOverallStatus } from "@/lib/statusMonitor";
import { recordServerSnapshot } from "@/lib/statusServerHistory";

export const dynamic = "force-dynamic";

// GET /api/status: a server-side snapshot of every service's health. The API
// probes are resolved against this deployment's own origin. Cached briefly at
// the edge so the footer indicator and external consumers do not each trigger a
// fresh fan-out of checks.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const services = await checkAllServices(origin);
  const overall = getOverallStatus(services);
  const timestamp = new Date().toISOString();
  recordServerSnapshot(services, timestamp);
  return Response.json(
    { overall, services, timestamp },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
