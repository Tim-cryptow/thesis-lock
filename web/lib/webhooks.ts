// EXPERIMENTAL / BETA. A best-effort webhook fan-out for transaction
// confirmations. State lives in a module-level Map, so it is per-instance and
// does NOT survive a serverless cold start or scale-out. This is intentional
// for an MVP/demo; do not rely on it for guaranteed delivery.

const HIRO_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.mainnet.hiro.so";

const HEX_TXID = /^(0x)?[0-9a-f]{64}$/i;
const MAX_PENDING = 200;
const POST_TIMEOUT_MS = 5_000;

type PendingWebhook = {
  url: string;
  txId: string;
  createdAt: number;
};

const registry = new Map<string, PendingWebhook>();
let processing = false;

function key(txId: string, url: string): string {
  return `${txId.toLowerCase()}|${url}`;
}

// Reject anything that could let a caller make the server reach internal
// infrastructure (SSRF). Only public https endpoints are accepted.
export function isSafeWebhookUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  // IPv6 literals keep their surrounding brackets in URL.hostname (for example
  // "[::1]"), so strip them before any host comparison.
  const rawHost = url.hostname.toLowerCase();
  const host =
    rawHost.startsWith("[") && rawHost.endsWith("]")
      ? rawHost.slice(1, -1)
      : rawHost;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }

  // Block IP-literal hosts in loopback, private, and link-local ranges
  // (including the cloud metadata address 169.254.169.254).
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map(Number);
    if (parts.some((p) => p > 255)) return false;
    const [a, b] = parts;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  // Loopback (::1), link-local (fe80::/10), and unique-local (fc00::/7, i.e. fc
  // and fd prefixes) IPv6 ranges.
  if (
    host === "::1" ||
    host.startsWith("fe80:") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    return false;
  }

  return true;
}

export function isValidTxId(txId: string): boolean {
  return HEX_TXID.test(txId);
}

export function registerWebhook(url: string, txId: string): boolean {
  if (!isValidTxId(txId) || !isSafeWebhookUrl(url)) return false;
  if (registry.size >= MAX_PENDING) return false;
  registry.set(key(txId, url), { url, txId, createdAt: Date.now() });
  return true;
}

function withHexPrefix(txId: string): string {
  // isValidTxId accepts a case-insensitive "0x"/"0X" prefix, so normalize to a
  // single lowercase "0x" before building the Hiro lookup URL.
  const lower = txId.toLowerCase();
  return lower.startsWith("0x") ? lower : `0x${lower}`;
}

// Opportunistically called from other routes. Polls each pending tx once and
// fires the webhook when it has confirmed (or drops it on a terminal failure).
// Fire-and-forget: callers should not await this on the hot path.
export async function processPendingWebhooks(): Promise<void> {
  if (processing || registry.size === 0) return;
  processing = true;
  try {
    const entries = Array.from(registry.entries());
    await Promise.allSettled(
      entries.map(async ([mapKey, hook]) => {
        let status: string;
        let blockHeight: number | null = null;
        try {
          const res = await fetch(
            `${HIRO_BASE}/extended/v1/tx/${withHexPrefix(hook.txId)}`,
            { signal: AbortSignal.timeout(POST_TIMEOUT_MS) },
          );
          if (!res.ok) return;
          const data = (await res.json()) as {
            tx_status?: string;
            block_height?: number;
          };
          status = data.tx_status ?? "pending";
          blockHeight = data.block_height ?? null;
        } catch {
          return;
        }

        const failed =
          status.startsWith("abort_") || status.startsWith("dropped");
        if (status !== "success" && !failed) return;

        registry.delete(mapKey);
        try {
          await fetch(hook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              txId: withHexPrefix(hook.txId),
              status,
              blockHeight,
            }),
            signal: AbortSignal.timeout(POST_TIMEOUT_MS),
          });
        } catch {
          // Delivery is best-effort; a failed POST is not retried.
        }
      }),
    );
  } finally {
    processing = false;
  }
}

export function pendingWebhookCount(): number {
  return registry.size;
}
