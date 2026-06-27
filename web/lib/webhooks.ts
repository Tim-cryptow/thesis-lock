// EXPERIMENTAL / BETA. A best-effort webhook fan-out for transaction
// confirmations. State lives in a module-level Map, so it is per-instance and
// does NOT survive a serverless cold start or scale-out. This is intentional
// for an MVP/demo; do not rely on it for guaranteed delivery.

import { lookup } from "node:dns/promises";
import https from "node:https";

const HIRO_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.mainnet.hiro.so";

const HEX_TXID = /^(0x)?[0-9a-f]{64}$/i;
const MAX_PENDING = 200;
const POST_TIMEOUT_MS = 5_000;
// Drop registrations that never reach a terminal tx state, so a flood of
// never-confirming ids cannot wedge the registry at MAX_PENDING. Matches the
// client tx-monitor timeout.
const STALE_MS = 30 * 60_000;

type ResolvedAddress = { address: string; family: number };

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

// IPv6 literals keep their surrounding brackets in URL.hostname (for example
// "[::1]"), so strip them before any host comparison.
function unbracket(host: string): string {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

function isBlockedIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const a = nums[0]!;
  const b = nums[1]!;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

// host must be a bare IP literal (brackets already stripped, lowercased).
// Returns false for DNS names so that public domains beginning with "fc"/"fd"
// (for example fcc.gov, fdroid.org) are not mistaken for IPv6 ULA literals.
function isBlockedIpLiteral(host: string): boolean {
  if (host.includes(":")) {
    // IPv6: loopback (::1), link-local (fe80::/10), unique-local (fc00::/7).
    if (host === "::1" || host.startsWith("fe80:")) return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true;
    // IPv4-mapped form (::ffff:a.b.c.d).
    if (host.includes(".")) {
      return isBlockedIpv4(host.slice(host.lastIndexOf(":") + 1));
    }
    return false;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return isBlockedIpv4(host);
  return false;
}

// Reject anything that could let a caller make the server reach internal
// infrastructure (SSRF). Only public https endpoints are accepted. This is a
// syntactic check; DNS names are also re-resolved and the connection is pinned
// at delivery time, see resolveSafeAddresses and deliverWebhook.
export function isSafeWebhookUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  const host = unbracket(url.hostname.toLowerCase());
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }

  return !isBlockedIpLiteral(host);
}

// Delivery-time guard against DNS rebinding. Resolve the host now and return the
// validated addresses to pin the outbound connection to; returns null (skip
// delivery) if it is internal or unresolvable. Pinning the exact addresses we
// checked closes the TOCTOU gap where a re-resolve at connect time could hand
// back a private address.
async function resolveSafeAddresses(host: string): Promise<ResolvedAddress[] | null> {
  if (isBlockedIpLiteral(host)) return null;
  // Public IP literal: connect directly, nothing to resolve.
  if (host.includes(":")) return [{ address: host, family: 6 }];
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return [{ address: host, family: 4 }];
  }
  try {
    const records = await lookup(host, { all: true });
    if (records.length === 0) return null;
    if (records.some((r) => isBlockedIpLiteral(r.address.toLowerCase()))) {
      return null;
    }
    return records.map((r) => ({ address: r.address, family: r.family }));
  } catch {
    return null;
  }
}

// POST the payload, pinning the TCP connection to addresses we already vetted.
// The original hostname is kept for TLS SNI and the Host header. https.request
// does not auto-follow redirects, so a 3xx Location is never fetched. Delivery
// is best-effort: any error resolves quietly without a retry.
function deliverWebhook(
  rawUrl: string,
  payload: string,
  addresses: ResolvedAddress[],
): Promise<void> {
  return new Promise((resolve) => {
    let target: URL;
    try {
      target = new URL(rawUrl);
    } catch {
      resolve();
      return;
    }
    const req = https.request(
      target,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
        timeout: POST_TIMEOUT_MS,
        lookup: ((_hostname, options, callback) => {
          if (options && (options as { all?: boolean }).all) {
            (callback as (e: null, a: ResolvedAddress[]) => void)(null, addresses);
          } else {
            callback(null, addresses[0]!.address, addresses[0]!.family);
          }
        }) as Parameters<typeof https.request>[1]["lookup"],
      },
      (res) => {
        res.resume();
        res.on("end", resolve);
        res.on("error", () => resolve());
      },
    );
    req.on("error", () => resolve());
    req.on("timeout", () => {
      req.destroy();
      resolve();
    });
    req.write(payload);
    req.end();
  });
}

function evictStale(): void {
  const cutoff = Date.now() - STALE_MS;
  for (const [mapKey, hook] of registry) {
    if (hook.createdAt < cutoff) registry.delete(mapKey);
  }
}

export function isValidTxId(txId: string): boolean {
  return HEX_TXID.test(txId);
}

export function registerWebhook(url: string, txId: string): boolean {
  if (!isValidTxId(txId) || !isSafeWebhookUrl(url)) return false;
  evictStale();
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
    evictStale();
    const entries = Array.from(registry.entries());
    await Promise.allSettled(
      entries.map(async ([mapKey, hook]) => {
        let status: string;
        let blockHeight: number | null = null;
        try {
          const res = await fetch(`${HIRO_BASE}/extended/v1/tx/${withHexPrefix(hook.txId)}`, {
            signal: AbortSignal.timeout(POST_TIMEOUT_MS),
          });
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

        const failed = status.startsWith("abort_") || status.startsWith("dropped");
        if (status !== "success" && !failed) return;

        registry.delete(mapKey);

        // Re-validate the target at delivery time, since the host may now
        // resolve to an internal address. The returned addresses pin the POST.
        if (!isSafeWebhookUrl(hook.url)) return;
        const host = unbracket(new URL(hook.url).hostname.toLowerCase());
        const addresses = await resolveSafeAddresses(host);
        if (!addresses) return;

        const payload = JSON.stringify({
          txId: withHexPrefix(hook.txId),
          status,
          blockHeight,
        });
        await deliverWebhook(hook.url, payload, addresses);
      }),
    );
  } finally {
    processing = false;
  }
}

export function pendingWebhookCount(): number {
  return registry.size;
}
