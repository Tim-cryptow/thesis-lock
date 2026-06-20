// A drop-in fetch wrapper that records API response times locally. It only
// tracks calls worth watching (the app's own /api/* routes and the Hiro API),
// leaving everything else as a plain fetch, and it never sends data anywhere.
// recordApiMetric is SSR-safe, so this is also harmless when a wrapped caller
// runs during server rendering (the call just is not recorded).

import { recordApiMetric } from "./performance";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hiro.so";

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input === "object" && input !== null && "method" in input) {
    return ((input as Request).method || "GET").toUpperCase();
  }
  return "GET";
}

function apiHost(): string {
  try {
    return new URL(API_URL).hostname;
  } catch {
    return "api.hiro.so";
  }
}

function resolved(url: string): URL | null {
  try {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    return new URL(url, origin);
  } catch {
    return null;
  }
}

function shouldTrack(url: string): boolean {
  if (url.startsWith("/api/")) return true;
  const u = resolved(url);
  if (!u) return false;
  if (u.pathname.startsWith("/api/")) return true;
  return u.hostname === apiHost() || u.hostname.endsWith("hiro.so");
}

// Collapse high-cardinality path segments (ids, hashes, principals) so the
// dashboard groups by endpoint shape rather than one row per unique id.
function normalizeSegment(segment: string): string {
  if (/^[0-9]+$/.test(segment)) return ":id";
  if (/^0x[0-9a-fA-F]+$/.test(segment)) return ":hash";
  if (/^[0-9a-fA-F]{40,}$/.test(segment)) return ":hash";
  if (/^S[PMNT][0-9A-Z]{20,}/.test(segment)) return ":addr";
  return segment;
}

function endpointOf(url: string): string {
  const u = resolved(url);
  if (!u) return url.split("?")[0];
  const path = u.pathname.split("/").map(normalizeSegment).join("/");
  const sameOrigin =
    typeof window !== "undefined" && u.origin === window.location.origin;
  return sameOrigin ? path : `${u.hostname}${path}`;
}

// Best-effort: a positive age or an explicit cache hit header means the response
// was served from a cache rather than freshly computed.
function isCached(res: Response): boolean {
  const age = res.headers.get("age");
  if (age && Number(age) > 0) return true;
  const hit = (
    res.headers.get("x-vercel-cache") ||
    res.headers.get("x-cache") ||
    res.headers.get("cf-cache-status") ||
    ""
  ).toLowerCase();
  return hit.includes("hit");
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export async function instrumentedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = urlOf(input);
  if (!shouldTrack(url)) {
    return fetch(input, init);
  }
  const method = methodOf(input, init);
  const start = now();
  try {
    const res = await fetch(input, init);
    recordApiMetric({
      endpoint: endpointOf(url),
      method,
      responseTime: now() - start,
      status: res.status,
      timestamp: new Date().toISOString(),
      cached: isCached(res),
    });
    return res;
  } catch (err) {
    recordApiMetric({
      endpoint: endpointOf(url),
      method,
      responseTime: now() - start,
      status: 0,
      timestamp: new Date().toISOString(),
      cached: false,
    });
    throw err;
  }
}
