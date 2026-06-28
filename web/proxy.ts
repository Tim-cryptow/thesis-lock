import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/csp";

// Security headers applied to every response. Next.js 16 renamed the
// `middleware` file convention to `proxy`; this is the same request-time hook.

// A deployment may point reads at a custom Hiro proxy via NEXT_PUBLIC_API_URL;
// its origin is added to the policy's connect-src so the browser may fetch it.
function configuredApiOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

const customApiOrigin = configuredApiOrigin();
const CSP = buildContentSecurityPolicy({
  connectSrc: customApiOrigin ? [customApiOrigin] : [],
  isDev: process.env.NODE_ENV !== "production",
});

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
