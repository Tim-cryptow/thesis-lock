// Webhook subscription management and payload signing. Subscriptions live in the
// browser (localStorage); like the rest of the app there is no server, so this
// is a format specification and management UI that developers can wire to their
// own delivery using the same signing scheme. The signature is a standard
// HMAC-SHA256 so the Node and Python verification snippets in the docs match.

export type WebhookSubscription = {
  id: string;
  url: string;
  name: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
  lastTriggered: string | null;
  failCount: number;
};

// The events a subscription can listen for, with copy for the UI and docs.
export const WEBHOOK_EVENTS = [
  {
    id: "anchor.created",
    label: "Anchor created",
    description: "A single document was anchored.",
  },
  {
    id: "batch.created",
    label: "Batch created",
    description: "A batch of documents was anchored in one transaction.",
  },
  {
    id: "group.anchor",
    label: "Group anchor",
    description: "A document was anchored to a group.",
  },
  {
    id: "proof.minted",
    label: "Proof minted",
    description: "A soulbound proof NFT was minted for an anchor.",
  },
  {
    id: "group.created",
    label: "Group created",
    description: "A new anchor group was created.",
  },
  {
    id: "group.member_added",
    label: "Member added",
    description: "A member was added to a group.",
  },
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number]["id"];

const STORAGE_KEY = "thesislock_webhooks";

// Dispatched after any change so an open UI can refresh.
export const WEBHOOKS_CHANGED_EVENT = "thesislock:webhooks-changed";

// ---------------------------------------------------------------------------
// Synchronous HMAC-SHA256 (FIPS 180-4 / RFC 2104) over UTF-8. Verified against
// Node's crypto.createHmac. Implemented inline so signing needs no async Web
// Crypto call and works identically on the server and in the browser.
// ---------------------------------------------------------------------------

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function utf8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function sha256Bytes(bytes: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLen = bytes.length * 8;
  const total = ((bytes.length + 1 + 8 + 63) >> 6) << 6;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 4, bitLen >>> 0, false);
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA256_K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const dvo = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) =>
    dvo.setUint32(i * 4, v >>> 0, false),
  );
  return out;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// HMAC-SHA256 of message under secret, hex encoded.
export function generateSignature(payload: string, secret: string): string {
  const blockSize = 64;
  let key = utf8(secret);
  if (key.length > blockSize) key = sha256Bytes(key);
  const padded = new Uint8Array(blockSize);
  padded.set(key);

  const ipad = new Uint8Array(blockSize);
  const opad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i += 1) {
    ipad[i] = padded[i] ^ 0x36;
    opad[i] = padded[i] ^ 0x5c;
  }

  const message = utf8(payload);
  const inner = new Uint8Array(blockSize + message.length);
  inner.set(ipad);
  inner.set(message, blockSize);
  const innerHash = sha256Bytes(inner);

  const outer = new Uint8Array(blockSize + innerHash.length);
  outer.set(opad);
  outer.set(innerHash, blockSize);
  return toHex(sha256Bytes(outer));
}

// ---------------------------------------------------------------------------
// Subscription storage
// ---------------------------------------------------------------------------

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  try {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < byteLength; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
  } catch {
    for (let i = 0; i < byteLength; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return toHex(bytes);
}

function coerce(value: unknown): WebhookSubscription | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.url !== "string") return null;
  return {
    id: v.id,
    url: v.url,
    name: typeof v.name === "string" ? v.name : "",
    events: Array.isArray(v.events)
      ? v.events.filter((e): e is string => typeof e === "string")
      : [],
    secret: typeof v.secret === "string" ? v.secret : "",
    active: typeof v.active === "boolean" ? v.active : true,
    createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
    lastTriggered: typeof v.lastTriggered === "string" ? v.lastTriggered : null,
    failCount: typeof v.failCount === "number" ? v.failCount : 0,
  };
}

export function loadSubscriptions(): WebhookSubscription[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(coerce)
      .filter((s): s is WebhookSubscription => s !== null);
  } catch {
    return [];
  }
}

export function saveSubscriptions(subs: WebhookSubscription[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
    window.dispatchEvent(new CustomEvent(WEBHOOKS_CHANGED_EVENT));
  } catch {
    // Persistence is best-effort.
  }
}

export function createSubscription(
  url: string,
  name: string,
  events: string[],
): WebhookSubscription {
  const subscription: WebhookSubscription = {
    id: randomHex(8),
    url,
    name,
    events: [...events],
    secret: `whsec_${randomHex(24)}`,
    active: true,
    createdAt: new Date().toISOString(),
    lastTriggered: null,
    failCount: 0,
  };
  const subs = loadSubscriptions();
  subs.push(subscription);
  saveSubscriptions(subs);
  return subscription;
}

export function deleteSubscription(id: string): void {
  saveSubscriptions(loadSubscriptions().filter((s) => s.id !== id));
}

export function toggleSubscription(id: string): void {
  saveSubscriptions(
    loadSubscriptions().map((s) =>
      s.id === id ? { ...s, active: !s.active } : s,
    ),
  );
}

// ---------------------------------------------------------------------------
// Payload format
// ---------------------------------------------------------------------------

export type WebhookPayload = {
  event: string;
  data: unknown;
  timestamp: string;
  signature: string;
};

// Builds the delivery payload for an event. The signature is the HMAC-SHA256 of
// the JSON of { event, data, timestamp } (the bytes a sender would transmit as
// the body), so a receiver recomputes it over the raw body. When no secret is
// given the signature is left empty (for display before a secret exists).
export function formatWebhookPayload(
  event: string,
  data: unknown,
  secret?: string,
): WebhookPayload {
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({ event, data, timestamp });
  return {
    event,
    data,
    timestamp,
    signature: secret ? generateSignature(body, secret) : "",
  };
}

// Representative data for each event type, for payload previews and the docs.
export function sampleEventData(event: string): Record<string, unknown> {
  const owner = "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM";
  const hash =
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const txId =
    "0x9f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff0";
  switch (event) {
    case "anchor.created":
      return { hash, label: "Thesis final draft", owner, txId, stacksBlock: 168420 };
    case "batch.created":
      return { batchId: 42, count: 5, owner, txId, stacksBlock: 168421 };
    case "group.anchor":
      return { groupId: 7, index: 3, hash, label: "Lab dataset", owner, txId };
    case "proof.minted":
      return { tokenId: 128, hash, owner, txId, stacksBlock: 168422 };
    case "group.created":
      return { groupId: 7, name: "Research Lab", admin: owner, txId };
    case "group.member_added":
      return { groupId: 7, member: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQVX8X0G", txId };
    default:
      return { txId };
  }
}
