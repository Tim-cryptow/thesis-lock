// Client-side rate limiter. It protects the public Hiro API and this app's own
// API routes from accidental request floods driven by the UI: rapid typing,
// retry loops, or a stuck effect that refetches on every render. It is
// deliberately a client-only guard. Server code paths (the /api route handlers)
// skip it entirely via the typeof window check below, so a single browser can
// never use this in-memory state to throttle requests for other users. Real
// abuse protection belongs at the edge or the upstream API, not here.

export class RateLimitError extends Error {
  // Milliseconds the caller should wait before the next attempt may succeed.
  readonly retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** Narrow an unknown caught value to a RateLimitError without relying on instanceof across bundles. */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return (
    error instanceof RateLimitError || (error instanceof Error && error.name === "RateLimitError")
  );
}

export type RateLimitOptions = {
  // Maximum number of calls permitted within a single window.
  limit: number;
  // Window length in milliseconds.
  windowMs: number;
};

type Bucket = { count: number; resetAt: number };

// Keyed by action name (for example "search"). The set of keys is small and
// fixed by the callers, so the map never grows unbounded.
const buckets = new Map<string, Bucket>();

/**
 * Fixed-window rate check for a named action. Returns silently when the call is
 * within budget and throws RateLimitError when the current window is exhausted.
 * On the server it is a no-op, so modules shared with API routes stay unaffected.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): void {
  if (typeof window === "undefined") return;

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return;
  }

  if (bucket.count >= options.limit) {
    throw new RateLimitError(bucket.resetAt - now);
  }

  bucket.count += 1;
}

/** Clear all rate-limit state. Intended for tests and for a full client reset. */
export function resetRateLimits(): void {
  buckets.clear();
}
