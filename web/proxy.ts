import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers applied to every response. Next.js 16 renamed the
// `middleware` file convention to `proxy`; this is the same request-time hook.

// connect-src lists the origins the browser may read from: same-origin, the
// Hiro mainnet hosts, and whatever NEXT_PUBLIC_API_URL is configured to (a
// deployment may point reads at a custom Hiro proxy). Wallet connection runs
// through injected extension providers, not page fetches, so it is unaffected.
function configuredApiOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

const CONNECT_SRC = Array.from(
  new Set(
    ["'self'", "https://api.hiro.so", "https://api.mainnet.hiro.so", configuredApiOrigin()].filter(
      (s): s is string => Boolean(s),
    ),
  ),
).join(" ");

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src ${CONNECT_SRC}`,
  "img-src 'self' data: blob:",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": CSP,
};

export function proxy(_request: NextRequest) {
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  // Skip static assets and image optimization; headers matter on documents and
  // API responses, not on hashed immutable static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
