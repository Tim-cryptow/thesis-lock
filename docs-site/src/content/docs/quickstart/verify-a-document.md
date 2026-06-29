---
title: Verify a document
description: Confirm when a hash was anchored, by which wallet, and that a file still matches.
sidebar:
  order: 2
---

Verification is public and needs no wallet or account. You can verify in the browser, or
from a script, the CLI, the SDK, or the REST API.

## In the browser

1. Go to `/v/<hash>` on [thesis-lock.vercel.app](https://thesis-lock.vercel.app), or open
   the verify page and paste a hash. You can also drop the file in and let the browser
   hash it for you.
2. If the hash is anchored, you see who anchored it (`anchored-by`), the Stacks and
   Bitcoin block heights, the label, and an approximate timestamp.
3. To confirm a file matches, drop it into the "verify your file" section. The browser
   re-hashes it locally and tells you whether the digest matches the anchor.

### Batch anchors

Batch anchors are keyed by both the hash and the anchoring wallet, so a verification link
for a batch-anchored document includes the owner principal:

```
/v/<hash>?owner=<principal>
```

## From the command line

Install the [CLI](/reference/cli/) and run:

```bash
npx thesislock-cli verify 9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06
```

It exits `0` when the hash is anchored and `1` when it is not, so it works directly as a
CI gate.

## From JavaScript or TypeScript

Use the [SDK](/reference/sdk/):

```ts
import { createClient } from "thesislock-sdk";

const client = createClient();
const result = await client.verify(
  "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06",
);

if (result.verified) {
  console.log("Anchored by", result.data.anchoredBy, "at block", result.data.stacksBlock);
}
```

## From the REST API

No installation required:

```bash
curl -s "https://thesis-lock.vercel.app/api/verify/9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06"
```

See the [REST API reference](/reference/rest-api/) for the full response shape and more
endpoints.

## Next

- Automate verification in CI with the [GitHub Action](/reference/github-action/).
- Understand [on-chain truth and the index](/concepts/on-chain-truth-and-the-index/) so
  you know exactly what a verification result is based on.
