import { generateRSS } from "@/lib/feedGenerator";
import {
  buildFeedOptions,
  fetchFeedEvents,
  parseFeedQuery,
} from "@/lib/feedData";

export const dynamic = "force-dynamic";

// GET /api/feed/rss: RSS 2.0 of recent protocol events. Filter with
// ?contract=<name>, ?address=<principal>, and ?limit=<n>.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = parseFeedQuery(url);
  const feedUrl = `${url.origin}${url.pathname}${url.search}`;

  // A feed reader is better served a valid empty feed than an error page.
  const events = await fetchFeedEvents(query).catch(() => []);

  const options = buildFeedOptions(url.origin, feedUrl, query);
  return new Response(generateRSS(events, options), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
