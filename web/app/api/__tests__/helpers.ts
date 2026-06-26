// Shared utilities for the API route handler tests. The handlers take a plain
// web Request and (for dynamic routes) a params Promise, so these build those
// inputs plus a couple of response stubs. This file is not a test suite; the
// runner only collects *.test.ts.

export const BASE = "https://thesis-lock.test";

// Builds a web Request for a route handler. A body object is JSON-encoded and
// the content-type set, matching how the routes read JSON bodies.
export function createMockRequest(
  method: string,
  url: string,
  body?: unknown,
): Request {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "content-type": "application/json" };
  }
  return new Request(url, init);
}

// A thin Request builder for GET routes that only read the URL and its search
// params.
export function mockNextRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

// A minimal stand-in for a Hiro fetch Response, for any route stubbed at the
// fetch level rather than through its lib function.
export function mockHiroResponse(data: unknown, ok = true): Response {
  return new Response(JSON.stringify(data), {
    status: ok ? 200 : 502,
    headers: { "content-type": "application/json" },
  });
}

// Wraps dynamic route params in the Promise the App Router passes to handlers.
export function routeParams<T extends Record<string, string>>(
  params: T,
): Promise<T> {
  return Promise.resolve(params);
}
