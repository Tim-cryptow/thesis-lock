import { cvToValue, deserializeCV } from "@stacks/transactions";

// Feed generation for the protocol event stream. The generators are pure (no
// network) so they are easy to test and reuse; contractEventsToFeed decodes the
// Clarity print events Hiro returns into the shared FeedEvent shape. Routes fetch
// and enrich the raw events, then call contractEventsToFeed and one generator.

export type FeedEvent = {
  title: string;
  description: string;
  // May be relative (for example /v/<hash>); generators resolve it against
  // options.link so emitted feeds carry absolute URLs.
  link: string;
  // ISO 8601. Empty when no block time was available.
  pubDate: string;
  guid: string;
  category: string;
};

export type FeedOptions = {
  title: string;
  description: string;
  link: string;
  feedUrl: string;
  language: string;
};

// A raw Hiro contract-log event, optionally enriched by the route with the
// transaction's block time.
type RawFeedEvent = {
  tx_id?: string;
  block_time?: number;
  contract_log?: {
    contract_id?: string;
    topic?: string;
    value?: { hex?: string };
  };
};

function stripHex(hex: string): string {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
}

// Escapes XML text and attribute content, dropping control characters that are
// invalid in XML 1.0 (tab, newline, and carriage return are kept). On-chain
// labels are ASCII, but this keeps the output well formed regardless of input.
function xml(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
      continue;
    }
    const ch = value[i];
    if (ch === "&") out += "&amp;";
    else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (ch === '"') out += "&quot;";
    else if (ch === "'") out += "&apos;";
    else out += ch;
  }
  return out;
}

function toRfc822(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date(0).toUTCString() : d.toUTCString();
}

function resolveUrl(link: string, base: string): string {
  if (/^https?:\/\//i.test(link)) return link;
  const root = base.replace(/\/$/, "");
  return `${root}${link.startsWith("/") ? "" : "/"}${link}`;
}

function isRawEvent(value: unknown): value is RawFeedEvent {
  return !!value && typeof value === "object";
}

function decodeTuple(ev: RawFeedEvent): Record<string, unknown> | null {
  const hex = ev.contract_log?.value?.hex;
  if (!hex) return null;
  try {
    const value = cvToValue(deserializeCV(stripHex(hex)), true);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

// The principal a feed event is attributed to, used for the ?address filter.
// Events with no actor in their print payload (group creation) return null and
// are excluded when a filter is applied.
export function eventActor(ev: unknown): string | null {
  if (!isRawEvent(ev)) return null;
  const tuple = decodeTuple(ev);
  if (!tuple) return null;
  const actor =
    asText(tuple["anchored-by"]) ||
    asText(tuple["owner"]) ||
    asText(tuple["member"]);
  return actor || null;
}

function mapEvent(
  ev: RawFeedEvent,
  tuple: Record<string, unknown>,
): FeedEvent | null {
  const event = asText(tuple["event"]);
  const txId = asText(ev.tx_id);
  const pubDate = ev.block_time
    ? new Date(ev.block_time * 1000).toISOString()
    : "";

  const build = (
    guidSuffix: string,
    title: string,
    description: string,
    link: string,
    category: string,
  ): FeedEvent => ({
    title,
    description,
    link,
    pubDate,
    guid: `${txId}:${guidSuffix}`,
    category,
  });

  switch (event) {
    case "anchor-created": {
      const hash = stripHex(asText(tuple["hash"])).toLowerCase();
      const label = asText(tuple["label"]);
      return build(
        `anchor:${hash}`,
        "New document anchored",
        label
          ? `A document was anchored on Stacks with label "${label}".`
          : "A document hash was anchored on Stacks.",
        `/v/${hash}`,
        "anchor",
      );
    }
    case "batch-anchored": {
      const count = asNumber(tuple["count"]);
      const owner = asText(tuple["owner"]);
      return build(
        `batch:${asText(tuple["batch-id"])}`,
        `Batch anchor (${count} ${count === 1 ? "file" : "files"})`,
        `A batch of ${count} document${count === 1 ? "" : "s"} was anchored on Stacks.`,
        owner ? `/u/${owner}` : "/feed",
        "batch",
      );
    }
    case "group-anchor-added": {
      const hash = stripHex(asText(tuple["hash"])).toLowerCase();
      const groupId = asNumber(tuple["group-id"]);
      const index = asNumber(tuple["index"]);
      const label = asText(tuple["label"]);
      return build(
        `group-anchor:${groupId}:${index}`,
        `Group anchor in group #${groupId}`,
        label
          ? `A document was anchored to group #${groupId} with label "${label}".`
          : `A document was anchored to group #${groupId}.`,
        `/v/${hash}?group=${groupId}&gi=${index}`,
        "group",
      );
    }
    case "group-created": {
      const groupId = asNumber(tuple["group-id"]);
      const name = asText(tuple["name"]) || `#${groupId}`;
      return build(
        `group-created:${groupId}`,
        `Group created: ${name}`,
        `Anchor group "${name}" was created.`,
        "/groups",
        "group",
      );
    }
    case "member-added": {
      const groupId = asNumber(tuple["group-id"]);
      return build(
        `member-added:${groupId}:${asText(tuple["member"])}`,
        `Member added to group #${groupId}`,
        `A member was added to anchor group #${groupId}.`,
        "/groups",
        "group",
      );
    }
    case "proof-minted": {
      const hash = stripHex(asText(tuple["hash"])).toLowerCase();
      const tokenId = asNumber(tuple["token-id"]);
      return build(
        `proof:${tokenId}`,
        `Proof NFT #${tokenId} minted`,
        `Soulbound proof NFT #${tokenId} was minted for an anchored document.`,
        `/v/${hash}`,
        "proof",
      );
    }
    default:
      // anchor-registered and member-removed are intentionally not surfaced:
      // the former mirrors a single anchor, the latter is not an addition.
      return null;
  }
}

// Converts raw Hiro contract events into feed events, skipping anything that is
// not a recognised, surfaced print event.
export function contractEventsToFeed(contractEvents: unknown[]): FeedEvent[] {
  const out: FeedEvent[] = [];
  for (const ev of contractEvents ?? []) {
    if (!isRawEvent(ev)) continue;
    const tuple = decodeTuple(ev);
    if (!tuple) continue;
    const mapped = mapEvent(ev, tuple);
    if (mapped) out.push(mapped);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

export function generateRSS(events: FeedEvent[], options: FeedOptions): string {
  const items = events
    .map((e) => {
      const link = resolveUrl(e.link, options.link);
      const fields = [
        `<title>${xml(e.title)}</title>`,
        `<link>${xml(link)}</link>`,
        `<description>${xml(e.description)}</description>`,
        e.pubDate ? `<pubDate>${xml(toRfc822(e.pubDate))}</pubDate>` : "",
        `<guid isPermaLink="false">${xml(e.guid)}</guid>`,
        e.category ? `<category>${xml(e.category)}</category>` : "",
      ].filter(Boolean);
      return `    <item>\n      ${fields.join("\n      ")}\n    </item>`;
    })
    .join("\n");

  const lastBuild = toRfc822(events[0]?.pubDate || new Date().toISOString());

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(options.title)}</title>
    <link>${xml(options.link)}</link>
    <description>${xml(options.description)}</description>
    <language>${xml(options.language)}</language>
    <atom:link href="${xml(options.feedUrl)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${xml(lastBuild)}</lastBuildDate>
${items}
  </channel>
</rss>`;
}

export function generateAtom(events: FeedEvent[], options: FeedOptions): string {
  const updated = events[0]?.pubDate || new Date().toISOString();
  const entries = events
    .map((e) => {
      const link = resolveUrl(e.link, options.link);
      const when = e.pubDate || updated;
      const category = e.category
        ? `\n    <category term="${xml(e.category)}" />`
        : "";
      return `  <entry>
    <title>${xml(e.title)}</title>
    <link href="${xml(link)}" />
    <id>tag:thesis-lock,2026:${xml(e.guid)}</id>
    <updated>${xml(when)}</updated>
    <published>${xml(when)}</published>
    <summary>${xml(e.description)}</summary>${category}
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xml(options.title)}</title>
  <subtitle>${xml(options.description)}</subtitle>
  <link href="${xml(options.link)}" />
  <link href="${xml(options.feedUrl)}" rel="self" type="application/atom+xml" />
  <id>${xml(options.feedUrl)}</id>
  <updated>${xml(updated)}</updated>
${entries}
</feed>`;
}

export function generateJSON(
  events: FeedEvent[],
  options: FeedOptions,
): object {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: options.title,
    home_page_url: options.link,
    feed_url: options.feedUrl,
    description: options.description,
    language: options.language,
    items: events.map((e) => ({
      id: e.guid,
      url: resolveUrl(e.link, options.link),
      title: e.title,
      content_text: e.description,
      ...(e.pubDate ? { date_published: e.pubDate } : {}),
      ...(e.category ? { tags: [e.category] } : {}),
    })),
  };
}
