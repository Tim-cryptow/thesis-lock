// Structured Content-Security-Policy builder. The policy is expressed as typed
// directive data and serialized in one place rather than hand-concatenated at
// the call site, so the middleware, any route that needs a tailored policy, and
// future per-request nonce wiring all share a single, unit-testable source of
// truth.

export type CspDirectives = Record<string, readonly string[]>;

// Origins the browser may open network connections to by default: same-origin
// and the Hiro mainnet API hosts. Reads route through these; wallet connections
// use injected extension providers, not page fetches, so they need no entry.
export const DEFAULT_CONNECT_SRC: readonly string[] = [
  "'self'",
  "https://api.hiro.so",
  "https://api.mainnet.hiro.so",
];

export type BuildCspOptions = {
  // Extra connect-src origins, for example a deployment's custom Hiro proxy.
  connectSrc?: readonly string[];
  // A per-request nonce. When supplied it is added to script-src so specific
  // inline scripts can be allow-listed. It is exported and accepted here for the
  // eventual migration off 'unsafe-inline'; the middleware does not pass one yet.
  nonce?: string;
  // The dev server compiles modules with eval for HMR and React Refresh, so it
  // needs 'unsafe-eval'. Production never evaluates strings and must omit it.
  isDev?: boolean;
};

/** Build the typed directive map for the app's Content-Security-Policy. */
export function buildCspDirectives(options: BuildCspOptions = {}): CspDirectives {
  const { connectSrc = [], nonce, isDev = false } = options;

  const scriptSrc = ["'self'", "'unsafe-inline'"];
  if (nonce) {
    scriptSrc.push(`'nonce-${nonce}'`);
  }
  if (isDev) {
    scriptSrc.push("'unsafe-eval'");
  }

  const connect = Array.from(new Set([...DEFAULT_CONNECT_SRC, ...connectSrc]));

  return {
    "default-src": ["'self'"],
    "script-src": scriptSrc,
    "style-src": ["'self'", "'unsafe-inline'"],
    "connect-src": connect,
    "img-src": ["'self'", "data:", "blob:"],
    // Structural directives: forbid plugins and base-tag hijacking, pin form
    // submissions to this origin, and block this app from being framed anywhere.
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
}

/** Serialize a directive map into a Content-Security-Policy header value. */
export function serializeCsp(directives: CspDirectives): string {
  return Object.entries(directives)
    .map(([name, values]) => (values.length > 0 ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

/** Convenience: build and serialize the policy in one call. */
export function buildContentSecurityPolicy(options: BuildCspOptions = {}): string {
  return serializeCsp(buildCspDirectives(options));
}

/**
 * Generate a cryptographically strong base64 nonce for inline-script
 * allow-listing. Uses Web Crypto, which is available both in the browser and in
 * the Edge and Node middleware runtimes. Exported for the planned nonce-based
 * CSP; not yet invoked by the middleware.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
