---
title: Sharing and profiles
description: Public wallet profiles, shareable links, QR codes, and embeddable badges.
sidebar:
  order: 6
---

ThesisLock makes it easy to share a verification publicly and to embed proof in other
sites. None of this exposes anything beyond the public on-chain data.

## Wallet profiles

Every wallet has a public profile at `/u/<principal>`. It shows anchoring stats (single
anchors, batch transactions, groups created, proof NFTs), the wallet's most recent registry
anchors with verify links, and the top document types inferred from labels. Profiles are
read-only and need no wallet to view. There is a JSON version at `/api/profile/<address>`
and an SVG count badge at `/api/profile-badge/<address>`.

## Sharing links

Verify pages, wallet profiles, group pages, and the stats page have share controls. You can
copy the link or share to X, LinkedIn, or Telegram. Shared links point only to public
ThesisLock pages and never include document contents beyond what is already on chain.

## QR codes

The verify page can show a QR code that encodes the verification URL, handy for linking to a
proof from print or a slide. The QR code is generated entirely in the browser as an SVG,
with no external service or network request.

## Embeddable badges and cards

You can embed proof in a README, a site, or a social post:

- **Status badge:** `GET /api/badge/<hash>` returns an SVG badge showing whether a hash is
  anchored. It accepts `style`, `label`, and `owner` query parameters.
- **Social card:** `GET /api/card/<hash>` returns an Open Graph image for link previews.
- **Profile badge:** `GET /api/profile-badge/<address>` returns an SVG badge with a wallet's
  anchor count.

The embed page in the app generates the markup for these for you. For the exact parameters
and response types, see the [REST API reference](/reference/rest-api/).

### Example: a status badge in Markdown

```markdown
[![ThesisLock](https://thesis-lock.vercel.app/api/badge/9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06)](https://thesis-lock.vercel.app/v/9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06)
```
