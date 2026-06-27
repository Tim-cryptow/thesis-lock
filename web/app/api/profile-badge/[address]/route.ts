import { getAnchorCount } from "@/lib/stacks";
import { isValidProfileAddress } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ address: string }>;
};

const ACTIVE_COLOR = "#4c1";
const INACTIVE_COLOR = "#9f9f9f";
const LABEL_COLOR = "#555";

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

function truncate(address: string): string {
  if (address.length <= 13) return address;
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

// Approximates rendered text width at 11px Verdana so the two badge segments
// size to their text the way shields.io does. Matches the per-hash badge route.
function textWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    if ("ilfjtI.,:;'|!".includes(ch)) width += 3.4;
    else if (ch === " ") width += 3.4;
    else if ("mwMW@".includes(ch)) width += 9.5;
    else if (ch >= "A" && ch <= "Z") width += 7.5;
    else width += 6.5;
  }
  return width;
}

function renderBadge(label: string, message: string, messageColor: string): string {
  const pad = 10;
  const rx = 3;
  const labelTextW = textWidth(label);
  const messageTextW = textWidth(message);
  const labelW = Math.round(labelTextW + pad * 2);
  const messageW = Math.round(messageTextW + pad * 2);
  const totalW = labelW + messageW;
  const height = 20;

  const labelCenter = Math.round((labelW / 2) * 10);
  const messageCenter = Math.round((labelW + messageW / 2) * 10);
  const labelLen = Math.round(labelTextW * 10);
  const messageLen = Math.round(messageTextW * 10);

  const labelEsc = escapeXml(label);
  const messageEsc = escapeXml(message);
  const ariaLabel = escapeXml(`${label}: ${message}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${height}" role="img" aria-label="${ariaLabel}">
<title>${ariaLabel}</title>
<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
<clipPath id="r"><rect width="${totalW}" height="${height}" rx="${rx}" fill="#fff"/></clipPath>
<g clip-path="url(#r)">
<rect width="${labelW}" height="${height}" fill="${LABEL_COLOR}"/>
<rect x="${labelW}" width="${messageW}" height="${height}" fill="${messageColor}"/>
<rect width="${totalW}" height="${height}" fill="url(#s)"/>
</g>
<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
<text aria-hidden="true" x="${labelCenter}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${labelLen}">${labelEsc}</text>
<text x="${labelCenter}" y="140" transform="scale(.1)" textLength="${labelLen}">${labelEsc}</text>
<text aria-hidden="true" x="${messageCenter}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${messageLen}">${messageEsc}</text>
<text x="${messageCenter}" y="140" transform="scale(.1)" textLength="${messageLen}">${messageEsc}</text>
</g>
</svg>`;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { address: raw } = await params;
  const address = (raw ?? "").trim().toUpperCase();

  let count = 0;
  if (isValidProfileAddress(address)) {
    try {
      count = await getAnchorCount(address);
    } catch {
      // Leave the count at zero on any lookup failure so the badge still renders.
    }
  }

  const message = `${count} anchors · ${truncate(address || "unknown")}`;
  const color = count > 0 ? ACTIVE_COLOR : INACTIVE_COLOR;
  const svg = renderBadge("ThesisLock", message, color);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600",
    },
  });
}
