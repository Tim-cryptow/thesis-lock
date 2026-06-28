import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "@/lib/csp";
import { isEmbeddableRoute } from "@/lib/embeddableRoutes";

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
const connectSrc = customApiOrigin ? [customApiOrigin] : [];
const isDev = process.env.NODE_ENV !== "production";

// Documents may not be framed; embeddable badge and image routes can be framed
// anywhere so they can live in a README, a social card, or another site.
const DOCUMENT_CSP = buildContentSecurityPolicy({ connectSrc, isDev });
const EMBEDDABLE_CSP = buildContentSecurityPolicy({ connectSrc, isDev, frameAncestors: ["*"] });

// Hardening headers sent on every response regardless of route.
const BASE_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Force HTTPS for a year including subdomains once a browser has seen the app.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  // Do not leak browsing intent by pre-resolving DNS for off-site links.
  "X-DNS-Prefetch-Control": "off",
};

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(BASE_HEADERS)) {
    response.headers.set(key, value);
  }

  if (isEmbeddableRoute(request.nextUrl.pathname)) {
    // Allow cross-origin embedding: a permissive frame policy and a resource
    // policy that lets a cross-origin <img> or scraper load the asset.
    response.headers.set("Content-Security-Policy", EMBEDDABLE_CSP);
    response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");
  } else {
    // Deny framing, keep this origin's resources same-origin, and isolate the
    // browsing context group while still letting wallet popups keep their opener.
    response.headers.set("Content-Security-Policy", DOCUMENT_CSP);
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  }

  return response;
}

export const config = {
  // Skip static assets and image optimization; headers matter on documents and
  // API responses, not on hashed immutable static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
