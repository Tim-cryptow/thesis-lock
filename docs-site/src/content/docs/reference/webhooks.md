---
title: Webhooks
description: Register webhooks for protocol events and verify their HMAC-SHA256 signatures.
sidebar:
  order: 8
---

Webhooks let an external service react to ThesisLock activity. You manage subscriptions in
the [developer portal](https://thesis-lock.vercel.app/developers) and verify delivered
payloads with a shared secret.

## Registering a webhook

Register a callback URL for a transaction id:

```bash
curl -s -X POST "https://thesis-lock.vercel.app/api/webhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/hook","txId":"0x<32-byte-hex-tx-id>"}'
```

| Field  | Description                                  |
| ------ | -------------------------------------------- |
| `url`  | A public HTTPS endpoint to call.             |
| `txId` | A 32-byte hex transaction id to watch.       |

A successful registration responds with `{ "registered": true, "txId": "..." }`. This
endpoint is best-effort and in beta: registrations are held in memory and not retried, so
treat it as a convenience rather than a guaranteed delivery system, and validate the target
before relying on it.

## Event payloads

A delivered webhook is an HTTP `POST` with a JSON body:

```json
{
  "event": "anchor.created",
  "data": {
    "hash": "9afe6f57...",
    "label": "thesis-final",
    "owner": "SP...",
    "txId": "0x...",
    "stacksBlock": 8104143
  },
  "timestamp": "2026-05-27T13:13:00.000Z"
}
```

Event types include:

| Event                 | When it fires                         |
| --------------------- | ------------------------------------- |
| `anchor.created`      | A single document is anchored.        |
| `batch.created`       | A batch is anchored.                  |
| `proof.minted`        | A proof NFT is minted.                |
| `group.created`       | A group is created.                   |
| `group.member_added`  | A member is added to a group.         |
| `group.anchor`        | A hash is anchored to a group.        |

## Verifying signatures

Each delivery carries an HMAC-SHA256 signature of the raw request body, computed with your
subscription secret, in the `X-ThesisLock-Signature` header:

```
X-ThesisLock-Signature: sha256=<hex>
```

Recompute the digest over the raw body and compare it in constant time.

```js
import crypto from "node:crypto";

function isValid(rawBody, header, secret) {
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
```

```python
import hmac, hashlib

def is_valid(raw_body: bytes, header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(header, expected)
```

Always verify against the exact raw bytes of the body, before any JSON parsing or
re-serialization.

## Retries

Retries are the responsibility of your delivery integration. A common policy is exponential
backoff (for example 1 minute, 5 minutes, then 30 minutes) before pausing a failing
endpoint.

## Chainhook ingestion

ThesisLock itself ingests on-chain events through a separate endpoint, `POST /api/chainhooks`,
which a [Hiro Chainhook](https://docs.hiro.so/chainhook) calls to populate the optional
index. It requires a Bearer token (set server-side as `CHAINHOOK_AUTH_TOKEN`) and processes
reorg-aware `apply` and `rollback` sets. This is an operator endpoint, not a public API; see
[On-chain truth and the index](/concepts/on-chain-truth-and-the-index/).
