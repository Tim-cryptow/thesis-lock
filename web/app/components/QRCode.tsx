"use client";

import { useMemo } from "react";
import { encode } from "@/lib/qr";

type QRCodeProps = {
  // The string to encode (for example a verification URL).
  value: string;
  // Rendered pixel size of the square. Defaults to 128.
  size?: number;
};

// Quiet zone, in modules, required around a QR Code so scanners can locate it.
const QUIET_ZONE = 4;

// Renders a scannable QR Code as an SVG. The encoder runs entirely in the
// browser with no external library or network request. The colors are fixed to
// black on white regardless of theme so the code always has the contrast a
// scanner needs.
export default function QRCode({ value, size = 128 }: QRCodeProps) {
  const matrix = useMemo(() => {
    if (!value) return null;
    try {
      return encode(value);
    } catch {
      // Data too large to encode; render nothing rather than a broken code.
      return null;
    }
  }, [value]);

  if (!matrix) return null;

  const dimension = matrix.size + QUIET_ZONE * 2;

  // Draw every dark module as a 1x1 square in a single path for compactness.
  let path = "";
  for (let row = 0; row < matrix.size; row++) {
    for (let col = 0; col < matrix.size; col++) {
      if (matrix.modules[row]![col]) {
        path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${dimension} ${dimension}`}
      role="img"
      aria-label="QR code"
      shapeRendering="crispEdges"
      className="block"
    >
      <rect width={dimension} height={dimension} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
