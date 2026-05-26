import { ImageResponse } from "next/og";

export const alt = "ThesisLock";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#FAFAF7",
          color: "#0F0F0F",
        }}
      >
        <div style={{ fontSize: 70, fontWeight: 600, lineHeight: 1.1, maxWidth: 960 }}>
          Permanent, verifiable timestamps for your work.
        </div>
        <div style={{ fontSize: 30, marginTop: 36, color: "#1A1A1A" }}>
          ThesisLock. Anchor a SHA-256 hash on Bitcoin via Stacks.
        </div>
      </div>
    ),
    size,
  );
}
