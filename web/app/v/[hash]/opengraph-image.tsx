import { ImageResponse } from "next/og";
import { fetchAnchor } from "@/lib/hiroAnchor";

export const alt = "ThesisLock verification";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEX_64 = /^[0-9a-f]{64}$/;

export default async function Image({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash: raw } = await params;
  const hash = (raw ?? "").toLowerCase();
  const valid = HEX_64.test(hash);

  let anchor: Awaited<ReturnType<typeof fetchAnchor>> = null;
  if (valid) {
    try {
      anchor = await fetchAnchor(hash);
    } catch {
      anchor = null;
    }
  }

  const verified = Boolean(anchor);
  const statusLabel = verified ? "Verified" : "Not Found";
  const statusColor = verified ? "#22C55E" : "#9CA3AF";
  const hashTop = hash.slice(0, 32);
  const hashBottom = hash.slice(32);

  return new ImageResponse(
    (
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
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -0.5 }}>
            ThesisLock
          </div>
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
          {verified && anchor ? (
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
                <span style={{ color: "#71717A", fontSize: 18 }}>
                  Stacks block
                </span>
                <span style={{ fontFamily: "monospace" }}>
                  {anchor.stacksBlock}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#71717A", fontSize: 18 }}>
                  Burn block
                </span>
                <span style={{ fontFamily: "monospace" }}>
                  {anchor.burnBlock}
                </span>
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
              {valid
                ? "No anchor record found for this hash."
                : "Invalid hash format."}
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
      </div>
    ),
    size,
  );
}
