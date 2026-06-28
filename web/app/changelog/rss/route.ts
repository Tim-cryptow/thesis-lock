import { RELEASES } from "@/lib/version";

// Mirrors the origin resolution used by the sitemap so the feed's links are
// absolute on any deployment.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://thesis-lock.vercel.app");

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// An ISO calendar date as an RFC 822 timestamp (midnight UTC), the format RSS
// pubDate expects.
function rfc822(date: string): string {
  return new Date(`${date}T00:00:00Z`).toUTCString();
}

// GET /changelog/rss: an RSS 2.0 feed of releases so people can subscribe to
// ThesisLock updates in a feed reader.
export function GET() {
  const changelogUrl = `${SITE_URL}/changelog`;

  const items = RELEASES.map((release) => {
    const description = [release.title, "", ...release.highlights.map((h) => `- ${h}`)].join("\n");
    return `    <item>
      <title>${escapeXml(`v${release.version}: ${release.title}`)}</title>
      <link>${escapeXml(changelogUrl)}</link>
      <guid isPermaLink="false">thesislock-release-${escapeXml(release.version)}</guid>
      <pubDate>${rfc822(release.date)}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ThesisLock releases</title>
    <link>${escapeXml(changelogUrl)}</link>
    <description>Release notes and version history for ThesisLock.</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
