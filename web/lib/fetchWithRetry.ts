// Wraps fetch with exponential backoff for transient failures. Hiro's public
// API occasionally returns 5xx or drops connections under load; a few spaced
// retries turn those blips into successful reads instead of surfaced errors.
// The signature matches @stacks/common's FetchFn so it can be injected as the
// network client's `fetch`, wrapping every read-only contract call.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.hiro.so";

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 3,
  delay = 1000,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      // Retry server errors; client errors (4xx) are not transient.
      if (response.status >= 500 && attempt < retries) {
        console.warn(
          `fetchWithRetry: ${url} returned ${response.status}, retry ${attempt + 1}/${retries}`,
        );
        await wait(delay * 2 ** attempt);
        continue;
      }
      return response;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        console.warn(
          `fetchWithRetry: ${url} failed (${err instanceof Error ? err.message : String(err)}), retry ${attempt + 1}/${retries}`,
        );
        await wait(delay * 2 ** attempt);
        continue;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`fetchWithRetry: request to ${url} failed`);
}

// Lightweight liveness probe for the Hiro API. Used by the verify page to tell
// "the API is down" apart from "this hash is not anchored" so the UI can show a
// specific message and auto-retry instead of a misleading "not found".
export async function isHiroAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/extended/v1/status`, {
      method: "GET",
    });
    return res.ok;
  } catch {
    return false;
  }
}
