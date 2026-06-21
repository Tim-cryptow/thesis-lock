import { getServerHistories } from "@/lib/statusServerHistory";

export const dynamic = "force-dynamic";

// GET /api/status/history: the recent per-service history this server instance
// has observed. It is best-effort and ephemeral (no database); the status page
// keeps the durable, per-visitor history in the browser.
export function GET() {
  return Response.json(
    {
      note: "Best-effort recent history from this server instance. Durable per-visitor history is kept in the browser on the status page.",
      services: getServerHistories(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
