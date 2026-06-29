---
title: FAQ
description: Common questions about anchoring, verifying, privacy, and costs.
sidebar:
  order: 1
---

## Is my document uploaded anywhere?

No. Your file is hashed in your browser (or locally by the CLI, SDK, or Action) and only
the 64-character SHA-256 digest is published. The document never leaves your device.

## What does anchoring actually prove?

That the exact bytes producing a given hash existed by the time of the anchor, and that a
particular wallet recorded them. It does not prove authorship, ownership, or the truth of
the contents. See [How proof of existence works](/introduction/how-proof-of-existence-works/).

## Do I need a wallet to verify?

No. Verifying, searching, and reading profiles are public and need no wallet or account.
You only need a wallet to anchor.

## How much does it cost?

Anchoring is a Stacks transaction, so it costs a small network fee. Verifying and all reads
are free.

## What if I lose the original file?

Proof of existence depends on being able to re-hash the exact file later. If the original
is lost or altered, you can no longer produce a matching hash, so keep it safe.

## Can I anchor the same file more than once?

In the `thesislock` single-anchor contract, a hash can be anchored once across the whole
contract; a second attempt returns `ERR-ALREADY-ANCHORED`. In `thesislock-batch`, anchors
are keyed by hash and owner, so different wallets can each anchor the same hash, and
re-anchoring for the same wallet is silently skipped.

## Which wallets are supported?

Leather, Xverse, and Asigna (multisig), through Stacks Connect.

## Can I edit or delete an anchor?

No. Records are immutable and the contracts have no edit or delete function. Deployed
Clarity contracts cannot be changed in place.

## Is the label private?

No. The label is public on-chain metadata. Keep it generic if the title itself is
sensitive.

## What is the difference between the Stacks block and the burn block?

The Stacks block is the height on the Stacks chain at confirmation; the burn block is the
Bitcoin block the Stacks block settled against. Both are stored so an anchor maps to both
timelines. See [Blocks, timestamps, and finality](/concepts/blocks-timestamps-and-finality/).

## Can I verify without using ThesisLock at all?

Yes. Anchors are public on chain. You can call the contracts' read-only functions directly
through the [Hiro API](https://api.mainnet.hiro.so); see the
[smart contract reference](/reference/smart-contracts/#calling-read-only-functions).

## A hash I just anchored is not found yet. Why?

The optional index can lag a freshly confirmed transaction by a short time. The app falls
back to reading the chain directly, and a verification result is never blocked on the index.
If you anchored in a batch, remember to include `?owner=<principal>` in the verify link.

## What happens to my anchors if the website goes away?

They persist on the Stacks blockchain regardless of the website. You can always verify them
directly against the chain with the [SDK](/reference/sdk/), [CLI](/reference/cli/), or the
Hiro API.
