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

// 'unsafe-eval' is only needed by the dev server (HMR and React Refresh compile
// modules with eval). The production bundle never evaluates strings, so it is
// dropped outside development to shrink the script attack surface.
const isProduction = process.env.NODE_ENV === "production";
const SCRIPT_SRC = isProduction
  ? "script-src 'self' 'unsafe-inline'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const CSP = [
  "default-src 'self'",
  SCRIPT_SRC,
  "style-src 'self' 'unsafe-inline'",
  `connect-src ${CONNECT_SRC}`,
  "img-src 'self' data: blob:",
  // Structural directives: forbid plugins and base-tag hijacking, pin form
  // submissions to this origin, and block this app from being framed anywhere.
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Force HTTPS for a year including subdomains once a browser has seen the app.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  // Do not leak browsing intent by pre-resolving DNS for off-site links.
  "X-DNS-Prefetch-Control": "off",
  // Isolate this origin's browsing context group while still allowing the
  // wallet and OAuth-style popups the app opens to keep their opener handle.
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
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
