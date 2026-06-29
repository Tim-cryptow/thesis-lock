---
title: Anchor your first document
description: Connect a wallet, hash a file in the browser, and anchor it on the Stacks blockchain.
sidebar:
  order: 1
---

This guide walks through anchoring a document in the [ThesisLock web app](https://thesis-lock.vercel.app).
It takes about a minute and costs a small Stacks transaction fee. Your file never leaves
your device.

## Before you start

You need a Stacks wallet. ThesisLock works with:

- [Leather](https://leather.io/)
- [Xverse](https://www.xverse.app/)
- [Asigna](https://asigna.io/) (multisig)

Fund the wallet with a little STX to cover the transaction fee.

## Steps

1. **Open the app and connect.** Go to
   [thesis-lock.vercel.app](https://thesis-lock.vercel.app) and connect your wallet.

2. **Drop your file.** On the anchor page, drag in the document you want to timestamp.
   The browser computes its SHA-256 hash locally and shows you the 64-character digest.
   The file itself is never uploaded.

3. **Add a label (optional).** A label is up to 64 ASCII characters of public metadata,
   for example `thesis-final-v2`. You can also pick a [template](/guides/web-app/) to
   produce a structured label. Treat the label as public and avoid putting secrets in it.

4. **Sign the transaction.** Confirm the contract call in your wallet. This calls
   `anchor-document` on the `thesislock` contract with your hash and label.

5. **Wait for confirmation.** Once the transaction is included in a Stacks block, the
   anchor is permanent. The app links you to the verification page at `/v/<hash>`.

That is it. The hash, your wallet, the block heights, and the label are now recorded on
chain and anyone can verify them.

## Anchor several files at once

To timestamp multiple documents together, use batch anchoring. You can anchor up to ten
files in a single transaction with the `thesislock-batch` contract. Batch anchors are
keyed by both the hash and your wallet, so verification links for them include your
principal: `/v/<hash>?owner=<principal>`.

## What gets recorded

| Field          | Meaning                                                  |
| -------------- | -------------------------------------------------------- |
| `hash`         | The SHA-256 digest of your file.                         |
| `anchored-by`  | The wallet (principal) that signed the transaction.     |
| `stacks-block` | The Stacks block height at confirmation.                |
| `burn-block`   | The Bitcoin block height the Stacks block settled to.   |
| `label`        | Your optional label.                                     |

## Next

- [Verify a document](/quickstart/verify-a-document/) to see the anchor from the other
  side.
- Learn the difference between [anchors, batches, registry, proofs, and groups](/concepts/).
