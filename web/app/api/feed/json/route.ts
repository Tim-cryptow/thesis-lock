import { generateJSON } from "@/lib/feedGenerator";
import { buildFeedOptions, fetchFeedEvents, parseFeedQuery } from "@/lib/feedData";

export const dynamic = "force-dynamic";

// GET /api/feed/json: JSON Feed 1.1 of recent protocol events. Same filtering as
// the RSS and Atom routes (?contract, ?address, ?limit).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = parseFeedQuery(url);
  const feedUrl = `${url.origin}${url.pathname}${url.search}`;

  const events = await fetchFeedEvents(query).catch(() => []);

  const options = buildFeedOptions(url.origin, feedUrl, query);
  return new Response(JSON.stringify(generateJSON(events, options)), {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
