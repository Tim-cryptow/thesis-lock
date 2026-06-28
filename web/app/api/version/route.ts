import { APP_VERSION, BUILD_DATE, LATEST_RELEASE } from "@/lib/version";

// GET /api/version: the deployed app version and latest release, for external
// tools that want to check which version is live.
export function GET() {
  return Response.json(
    {
      version: APP_VERSION,
      buildDate: BUILD_DATE,
      latestRelease: {
        version: LATEST_RELEASE.version,
        date: LATEST_RELEASE.date,
        title: LATEST_RELEASE.title,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
