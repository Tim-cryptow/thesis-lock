import { ImageResponse } from "next/og";
import { HEX_64, verifyHash } from "@/lib/verify";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ hash: string }>;
};

const HIRO_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mainnet.hiro.so";

// Best-effort lookup of a Stacks block's wall-clock time so the card can show
// when the anchor landed. Any failure just drops the timestamp line.
async function fetchBlockTimeIso(stacksBlock: number): Promise<string | null> {
  try {
    const res = await fetch(`${HIRO_BASE}/extended/v2/blocks/${stacksBlock}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { block_time_iso?: string };
    return data.block_time_iso ?? null;
  } catch {
    return null;
  }
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export async function GET(req: Request, { params }: RouteContext) {
  const { hash: raw } = await params;
  const hash = (raw ?? "").toLowerCase();
  const valid = HEX_64.test(hash);

  const url = new URL(req.url);
  const owner = url.searchParams.get("owner") ?? undefined;

  let verified = false;
  let stacksBlock: number | null = null;
  let label = "";
  // Default to the document's own verify page on this origin. When the hash
  // resolves, prefer the result's verifyUrl so batch anchors carry ?owner=.
  let verifyHref = `${url.origin}/v/${hash}${owner ? `?owner=${owner}` : ""}`;

  if (valid) {
    try {
      const result = await verifyHash(hash, owner, url.origin);
      if (result.verified) {
        verified = true;
        stacksBlock = result.stacksBlock;
        label = result.label;
        verifyHref = result.verifyUrl;
      }
    } catch {
      verified = false;
    }
  }

  const timestamp =
    verified && stacksBlock !== null
      ? formatTimestamp((await fetchBlockTimeIso(stacksBlock)) ?? "")
      : "";

  const statusLabel = verified ? "Verified" : "Not Verified";
  const statusColor = verified ? "#22C55E" : "#9CA3AF";
  const hashShort = `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  const verifyDisplay = verifyHref.replace(/^https?:\/\//, "");

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0B0B0E",
        color: "#F5F5F0",
        padding: 40,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>ThesisLock</div>
        <div
          style={{
            fontSize: 20,
            padding: "8px 18px",
            borderRadius: 9999,
            background: "rgba(255,255,255,0.06)",
            color: statusColor,
            border: `2px solid ${statusColor}`,
            fontWeight: 600,
            display: "flex",
          }}
        >
          {statusLabel}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            fontSize: 14,
            color: "#A1A1AA",
            letterSpacing: 3,
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          SHA-256
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 30,
            color: "#F5F5F0",
            display: "flex",
          }}
        >
          {hashShort}
        </div>
        {verified && stacksBlock !== null ? (
          <div style={{ display: "flex", gap: 40, marginTop: 8 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#71717A", fontSize: 14 }}>Stacks block</span>
              <span style={{ fontFamily: "monospace", fontSize: 22 }}>{stacksBlock}</span>
            </div>
            {label ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#71717A", fontSize: 14 }}>Label</span>
                <span style={{ fontSize: 22 }}>{label}</span>
              </div>
            ) : null}
            {timestamp ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#71717A", fontSize: 14 }}>Timestamp</span>
                <span style={{ fontFamily: "monospace", fontSize: 22 }}>{timestamp}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ color: "#A1A1AA", fontSize: 18, display: "flex" }}>
            {valid ? "No anchor record found for this hash." : "Invalid hash format."}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          fontSize: 14,
          color: "#71717A",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "monospace",
            wordBreak: "break-all",
          }}
        >
          Verify at {verifyDisplay}
        </div>
        <div style={{ display: "flex" }}>Anchored on Stacks</div>
      </div>
    </div>,
    {
      width: 600,
      height: 300,
      headers: { "Cache-Control": "public, s-maxage=300" },
    },
  );
}
