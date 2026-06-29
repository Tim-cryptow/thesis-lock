---
title: Feeds
description: RSS, Atom, and JSON feeds of ThesisLock protocol events, filterable by contract and wallet.
sidebar:
  order: 7
---

ThesisLock publishes protocol activity as standard feeds, so you can follow anchors in any
reader or pipe them into automation.

## Endpoints

| Endpoint         | Format        | Content type                          |
| ---------------- | ------------- | ------------------------------------- |
| `/api/feed/rss`  | RSS 2.0       | `application/rss+xml; charset=utf-8`  |
| `/api/feed/atom` | Atom 1.0      | `application/atom+xml; charset=utf-8` |
| `/api/feed/json` | JSON Feed 1.1 | `application/feed+json; charset=utf-8`|

All three send `Access-Control-Allow-Origin: *` and are cached `s-maxage=300`.

## Query parameters

| Query      | Default | Description                                                           |
| ---------- | ------- | -------------------------------------------------------------------- |
| `contract` | all     | Filter to one contract (`batch`, `groups`, `proof`, or a full name). |
| `address`  | all     | Filter to a wallet (Stacks principal).                               |
| `limit`    | `50`    | Maximum items, up to `100`.                                          |

```bash
# All recent activity as RSS
curl -s "https://thesis-lock.vercel.app/api/feed/rss"

# Just one wallet's activity as JSON, capped at 20 items
curl -s "https://thesis-lock.vercel.app/api/feed/json?address=SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM&limit=20"
```

## Autodiscovery

The app's pages include `<link rel="alternate">` tags pointing at these feeds, so feed
readers can discover them automatically when you paste a page URL.

## Subscribe and automate

- Paste a feed URL into any RSS or Atom reader.
- For push-style integrations (Slack, IFTTT, Zapier), point the service at a feed, or use
  [webhooks](/reference/webhooks/) for signed event payloads.
