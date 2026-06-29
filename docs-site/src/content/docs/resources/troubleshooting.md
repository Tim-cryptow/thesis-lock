---
title: Troubleshooting
description: Fixes for common problems anchoring and verifying documents.
sidebar:
  order: 3
---

## A hash shows as not anchored

- Confirm you are verifying the exact original file. Any change, even one byte, produces a
  different hash.
- If you anchored very recently, the optional index may not have caught up. The app falls
  back to the chain, so retrying usually resolves it.
- If the document was batch-anchored, include the owner in the verify link:
  `/v/<hash>?owner=<principal>`.

## "Already anchored" when anchoring

The `thesislock` single-anchor contract allows a hash once across the whole contract, so an
existing anchor returns `ERR-ALREADY-ANCHORED` (`u100`). This usually means the document is
already proven. If you need a separate, owner-scoped record, use batch anchoring.

## A file does not match the anchored hash

The file differs from the one that was anchored. Use the [hash matcher](/guides/verifying-documents/#match-files-and-hashes)
to compare digests; it highlights the differing characters. Make sure you are checking the
exact original, not an edited or re-exported copy.

## My wallet will not connect

- Use a supported wallet: Leather, Xverse, or Asigna.
- Make sure the wallet is unlocked and set to mainnet, then refresh the page.
- Disable conflicting wallet extensions if more than one is injecting a provider.

## A transaction is stuck pending

Anchors are confirmed when included in a Stacks block, which can take a few minutes. Check
the transaction in a Stacks explorer. The anchor is not final until it is mined and settled.

## Results differ between tools

Different tools may read the index or the chain at slightly different times, so a brand-new
anchor can appear in one before another. For the strongest guarantee, read the contracts
directly with the [SDK](/reference/sdk/), [CLI](/reference/cli/), or the Hiro API. See
[On-chain truth and the index](/concepts/on-chain-truth-and-the-index/).

## The API returns 429 (rate limited)

You are sending requests too quickly. Back off and retry, and cache results where you can;
most read endpoints set a short `s-maxage` you can respect.

## My collections, tags, or watchlist disappeared

These are stored in your browser, so clearing site data removes them and they do not sync
across devices or browsers. Restore from a backup if you exported one; you can export and
import from the settings page. See [Organizing your anchors](/guides/organizing-your-anchors/).

## Still stuck?

Open an issue on [GitHub](https://github.com/Tim-cryptow/thesis-lock/issues) with the
hash (safe to share), what you expected, and what you saw.
