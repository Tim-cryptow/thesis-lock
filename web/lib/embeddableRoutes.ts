// Routes whose responses are meant to be loaded by third-party pages: the SVG
// and PNG status badges, the Open Graph cards and social images, and the NFT
// metadata and image. A README, a social scraper, or another site loads these
// cross-origin, usually through an <img> tag, so they need a cross-origin
// resource policy and relaxed frame protection. Every other route, including the
// /embed badge-builder page itself, keeps the strict unframable, same-origin
// defaults so it cannot be wrapped for clickjacking.

export const EMBEDDABLE_PREFIXES = [
  "/api/badge",
  "/api/card",
  "/api/nft",
  "/api/profile-badge",
  "/api/status/badge",
] as const;

/** True when the path serves an asset intended for cross-origin embedding. */
export function isEmbeddableRoute(pathname: string): boolean {
  for (const prefix of EMBEDDABLE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  // Next.js generated social images: <segment>/opengraph-image and the per
  // -anchor share image at /v/<hash>/share-image.
  if (pathname === "/opengraph-image" || pathname.endsWith("/opengraph-image")) {
    return true;
  }
  if (pathname.endsWith("/share-image")) {
    return true;
  }
  return false;
}
