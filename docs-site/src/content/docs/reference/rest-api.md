---
title: REST API
description: Public HTTP endpoints for verification, search, badges, profiles, stats, and health.
sidebar:
  order: 5
---

The ThesisLock web app serves a public REST API. All endpoints are unauthenticated and
return data derived from the chain. Use it when you do not want to install the SDK or CLI.

## Conventions

- **Base URL:** `https://thesis-lock.vercel.app`
- **Auth:** none. The API is public and read-only (except the ingestion endpoint).
- **CORS:** most endpoints send `Access-Control-Allow-Origin: *` and answer `OPTIONS`
  preflight with `204`.
- **Caching:** responses set `Cache-Control` with a short `s-maxage`, noted per endpoint.
- **Errors:** failures return a JSON `{ "error": "..." }` body with a `4xx` or `5xx` status.

## Verification

### GET /api/verify/&lt;hash&gt;

Verify a single hash. The hash is 64 hex characters (an optional `0x` is accepted).

| Query   | Default | Description                          |
| ------- | ------- | ------------------------------------ |
| `owner` | none    | Stacks principal for a batch lookup. |
| `format`| `json`  | Only `json` is supported.            |

```bash
curl -s "https://thesis-lock.vercel.app/api/verify/9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06"
```

```json
{
  "verified": true,
  "source": "single",
  "hash": "9afe6f57...",
  "label": "thesis-final",
  "owner": "SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX",
  "stacksBlock": 8104143,
  "burnBlock": 840000,
  "contract": "thesislock",
  "verifyUrl": "https://thesis-lock.vercel.app/v/9afe6f57..."
}
```

`source` is one of `single`, `batch`, `registry`, `proof`, or `group`. When a hash is not
anchored, `verified` is `false`. Cached `s-maxage=60`.

```js
const res = await fetch(`https://thesis-lock.vercel.app/api/verify/${hash}`);
const data = await res.json();
if (data.verified) console.log("anchored at", data.stacksBlock);
```

```python
import requests
data = requests.get(f"https://thesis-lock.vercel.app/api/verify/{hash}").json()
print(data["verified"])
```

### POST /api/verify

Verify by JSON or by uploading a file to hash server-side.

```bash
# JSON body
curl -s -X POST "https://thesis-lock.vercel.app/api/verify" \
  -H "Content-Type: application/json" \
  -d '{"hash":"9afe6f57...","owner":"SP..."}'

# multipart file upload (hashed in the request, not stored)
curl -s -X POST "https://thesis-lock.vercel.app/api/verify" -F "file=@thesis.pdf"
```

The body is either `{ hash, owner? }` or a `multipart/form-data` request with a `file`
field and optional `owner`. When a file is uploaded, the response includes the
`computedHash`.

## Search

### GET /api/search

Search by hash, principal, or label.

| Query   | Default | Description                                       |
| ------- | ------- | ------------------------------------------------- |
| `q`     | none    | Required. The search query.                       |
| `type`  | `auto`  | `auto`, `hash`, `principal`, or `label`.          |
| `owner` | none    | Restrict to a principal where relevant.           |

`auto` detects a 64-hex hash, an `SP`/`ST` principal, or otherwise a label substring.
Cached `s-maxage=30`.

```bash
curl -s "https://thesis-lock.vercel.app/api/search?q=thesis"
```

## Compare

### GET /api/compare

Compare two anchors.

| Query             | Description                                  |
| ----------------- | -------------------------------------------- |
| `a`, `b`          | Required. The two 64-hex hashes.             |
| `ownerA`, `ownerB`| Owners for batch lookups.                    |
| `groupA`, `giA`   | Group id and group index for hash A.         |
| `groupB`, `giB`   | Group id and group index for hash B.         |

Returns which anchor came first, the block gap, and relationship details. Cached
`s-maxage=120`. See the [compare guide](/guides/verifying-documents/#compare-two-anchors).

## Reports

### POST /api/report

Build a multi-document verification report.

| Query    | Default | Description                 |
| -------- | ------- | --------------------------- |
| `format` | `json`  | `json`, `csv`, or `html`.   |

```bash
curl -s -X POST "https://thesis-lock.vercel.app/api/report?format=html" \
  -H "Content-Type: application/json" \
  -d '{"hashes":[{"hash":"9afe6f57...","filename":"thesis.pdf"}],"owner":"SP..."}'
```

The body is `{ hashes, owner? }`, where `hashes` is an array of strings or
`{ hash, filename? }` objects. The response content type matches `format`
(`application/json`, `text/csv`, or `text/html`). Not cached.

## Badges and cards

### GET /api/badge/&lt;hash&gt;

An SVG status badge for a hash.

| Query   | Default      | Description                          |
| ------- | ------------ | ------------------------------------ |
| `style` | `flat`       | `flat` or `rounded`.                 |
| `label` | `ThesisLock` | Badge label, up to 60 characters.    |
| `owner` | none         | Principal for a batch lookup.        |

Returns `image/svg+xml`, cached `s-maxage=300`.

### GET /api/card/&lt;hash&gt;

An Open Graph image (for link previews). Accepts `owner`. Cached `s-maxage=300`.

### GET /api/profile-badge/&lt;address&gt;

An SVG badge with a wallet's anchor count. Green when the wallet has at least one anchor,
gray otherwise. Cached `s-maxage=600`.

## NFT metadata

### GET /api/nft/&lt;id&gt;

SIP-009 proof NFT metadata for a token id, as returned by the proof contract's
`get-token-uri`.

```json
{
  "name": "ThesisLock Proof #1",
  "description": "...",
  "image": "https://thesis-lock.vercel.app/...",
  "external_url": "https://thesis-lock.vercel.app/v/...",
  "attributes": [{ "trait_type": "...", "value": "..." }]
}
```

Cached `s-maxage=3600`.

## Profiles, analytics, and activity

### GET /api/profile/&lt;address&gt;

A wallet profile: totals, first and last activity, recent anchors, and top labels. Cached
`s-maxage=300`. Returns `400` on an invalid principal.

### GET /api/analytics

Wallet analytics. Requires `address`. Cached `s-maxage=120`.

### GET /api/activity

A per-wallet activity timeline.

| Query     | Default | Description                                                |
| --------- | ------- | ---------------------------------------------------------- |
| `address` | none    | Required. Stacks principal.                                |
| `page`    | `0`     | Zero-based page index.                                     |
| `limit`   | `20`    | Page size.                                                 |
| `type`    | none    | `anchors`, `groups`, `proofs`, or `registry` to filter.    |

Returns `{ events, total, hasMore }`, events newest first. Cached `s-maxage=60`.

## Explorer

### GET /api/explorer/&lt;contract&gt;

Contract metadata plus recent on-chain calls. Cached `s-maxage=120`.

### GET /api/explorer/&lt;contract&gt;/call

Proxy a read-only contract call.

| Query  | Default | Description                                  |
| ------ | ------- | -------------------------------------------- |
| `fn`   | none    | Required. The read-only function name.       |
| `args` | `[]`    | JSON-encoded array of arguments.             |

## Stats

### GET /api/stats

Protocol totals and a daily series. Cached `s-maxage=300`.

## Health, status, and version

### GET /api/health

```json
{ "status": "ok", "contracts": { "thesislock": "...", "batch": "...", "registry": "..." }, "version": "1.6.0" }
```

Cached `s-maxage=60`.

### GET /api/status

A service health snapshot: `{ overall, services, timestamp, version }`. Cached `s-maxage=30`.

### GET /api/status/badge

An SVG system-status badge. Cached `s-maxage=30`.

### GET /api/status/history

Recent per-service health observed by the serving instance: `{ note, services }`. Not cached.

### GET /api/version

```json
{ "version": "1.6.0", "buildDate": "2026-06-28", "latestRelease": { "version": "1.6.0", "date": "2026-06-28", "title": "..." } }
```

Cached `s-maxage=60`.

## Feeds and webhooks

Protocol event feeds live at `/api/feed/rss`, `/api/feed/atom`, and `/api/feed/json`; see
[Feeds](/reference/feeds/). Webhook registration is `POST /api/webhook`, and the Chainhook
ingestion endpoint is `POST /api/chainhooks`; see [Webhooks](/reference/webhooks/).
