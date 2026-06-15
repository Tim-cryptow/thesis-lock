import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers applied to every response. Next.js 16 renamed the
// `middleware` file convention to `proxy`; this is the same request-time hook.
// connect-src is limited to self and the Hiro mainnet API, the only origins the
// app talks to (reads route through Hiro; everything else is same-origin).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://api.hiro.so https://api.mainnet.hiro.so",
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
