const CACHE = "thesislock-v3";

// App shell routes pre-cached so the core flows open without a network. The
// offline page is included so navigations to uncached routes can fall back to
// the themed app page rather than a bare inline document. The troubleshooting
// page is pre-cached because the offline banner links to it: its content is
// server-rendered, so it stays readable from cache even with no connection.
const APP_SHELL = ["/", "/anchor", "/search", "/docs", "/offline", "/help/troubleshooting"];

// Shown for navigations to routes that were never cached while offline.
const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FAFAF7;color:#1A1A1A;font-family:system-ui,sans-serif;text-align:center;padding:1.5rem}main{max-width:28rem}h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#555;line-height:1.5;margin:0}</style></head><body><main><h1>You're offline</h1><p>This page hasn't been cached yet. Reconnect to load it. File hashing still works offline, but anchoring and verification require a connection.</p></main></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|ico|webp)$/.test(url.pathname)
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Don't substitute the home document for an arbitrary uncached route (e.g.
    // a bookmarked /v/<hash>): that would render home content under the wrong
    // URL. Serve a clear offline page for navigations instead.
    if (request.mode === "navigate") {
      // Prefer the cached, themed /offline page; fall back to the inline
      // document if it was never cached (e.g. first load was already offline).
      const offline = await cache.match("/offline");
      if (offline) return offline;
      return new Response(OFFLINE_PAGE, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Leave cross-origin requests (e.g. the Hiro API) to the network untouched.
  if (url.origin !== self.location.origin) return;

  // Never cache API responses: replaying a stale anchor/verification result
  // while offline would mislead the user, so let these hit the network only.
  if (url.pathname.startsWith("/api/")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
