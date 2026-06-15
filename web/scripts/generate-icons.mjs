// Generates the PWA app icons from a vector "TL" monogram. Run with:
//   node scripts/generate-icons.mjs
// Shapes are pure rectangles so rendering does not depend on any installed
// font. Output lands in web/public.
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");

const BG = "#0F0F0F";
const FG = "#FAFAF7";

// 512x512 viewBox. "T" on the left, "L" on the right, drawn from bars.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="${BG}"/>
  <g fill="${FG}">
    <rect x="96" y="150" width="136" height="34" rx="6"/>
    <rect x="147" y="150" width="34" height="212" rx="6"/>
    <rect x="296" y="150" width="34" height="212" rx="6"/>
    <rect x="296" y="328" width="120" height="34" rx="6"/>
  </g>
</svg>`;

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

const input = Buffer.from(svg);

await Promise.all(
  targets.map(({ file, size }) =>
    sharp(input)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, file)),
  ),
);

console.log("Generated:", targets.map((t) => t.file).join(", "));
