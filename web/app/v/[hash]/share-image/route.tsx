import { ImageResponse } from "next/og";
import { fetchAnchor, fetchBatchAnchor } from "@/lib/hiroAnchor";

const HEX_64 = /^[0-9a-f]{64}$/;
const STX_PRINCIPAL = /^S[PMNT][0-9A-Z]{5,40}$/;

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ hash: string }>;
};

export async function GET(req: Request, { params }: RouteContext) {
  const { hash: raw } = await params;
  const hash = (raw ?? "").toLowerCase();
  const valid = HEX_64.test(hash);

  const url = new URL(req.url);
  const ownerRaw = url.searchParams.get("owner") ?? "";
  const owner = STX_PRINCIPAL.test(ownerRaw.toUpperCase()) ? ownerRaw.toUpperCase() : null;

  let verified = false;
  let stacksBlock: number | null = null;
  let burnBlock: number | null = null;

  if (valid) {
    try {
      // An explicit ?owner= prefers the owner-keyed batch record over a global
      // single anchor with the same hash, matching the verification page.
      const batch = owner ? await fetchBatchAnchor(hash, owner) : null;
      if (batch) {
        verified = true;
        stacksBlock = batch.stacksBlock;
        burnBlock = batch.burnBlock;
      } else {
        const single = await fetchAnchor(hash);
        if (single) {
          verified = true;
          stacksBlock = single.stacksBlock;
          burnBlock = single.burnBlock;
        }
      }
    } catch {
      verified = false;
    }
  }

  const statusLabel = verified ? "Verified" : "Not Found";
  const statusColor = verified ? "#22C55E" : "#9CA3AF";
  const hashTop = hash.slice(0, 32);
  const hashBottom = hash.slice(32);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0B0B0E",
        color: "#F5F5F0",
        padding: 72,
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
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -0.5 }}>ThesisLock</div>
        <div
          style={{
            fontSize: 28,
            padding: "10px 22px",
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
          alignItems: "center",
          gap: 24,
        }}
      >
        <div
          style={{
            fontSize: 22,
            color: "#A1A1AA",
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          SHA-256
        </div>
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 38,
            lineHeight: 1.25,
            textAlign: "center",
            color: "#F5F5F0",
            wordBreak: "break-all",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>{hashTop}</span>
          <span>{hashBottom}</span>
        </div>
        {verified && stacksBlock !== null ? (
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 48,
              color: "#D4D4D8",
              fontSize: 26,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#71717A", fontSize: 18 }}>Stacks block</span>
              <span style={{ fontFamily: "monospace" }}>{stacksBlock}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#71717A", fontSize: 18 }}>Burn block</span>
              <span style={{ fontFamily: "monospace" }}>{burnBlock}</span>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 28,
              color: "#A1A1AA",
              fontSize: 24,
              display: "flex",
            }}
          >
            {valid ? "No anchor record found for this hash." : "Invalid hash format."}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 22,
          color: "#71717A",
        }}
      >
        <div style={{ display: "flex" }}>thesis-lock.vercel.app</div>
        <div style={{ display: "flex" }}>Anchored on Stacks</div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
