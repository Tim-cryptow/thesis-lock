---
title: What is ThesisLock?
description: A hash-anchoring and proof-of-existence service for documents on the Stacks blockchain, secured by Bitcoin.
sidebar:
  order: 1
  label: What is ThesisLock?
---

ThesisLock is a hash-anchoring service for academic and creative documents on the
Stacks blockchain. It gives you a permanent, publicly verifiable timestamp that proves a
document existed at a point in time, without ever revealing the document itself.

The flow is simple:

1. You drop a file into the [web app](https://thesis-lock.vercel.app). The browser
   computes its SHA-256 hash locally. The file never leaves your device.
2. You sign a Stacks transaction that anchors the hash on chain, with an optional label.
3. Anyone can later visit `/v/<hash>` to verify when the anchor was created, by which
   wallet, and what label was attached, and re-upload a file to confirm its hash matches.

Because only the hash is published, the contents stay private. Because the hash is on a
public blockchain settled to Bitcoin, the timestamp is permanent and anyone can check it.

## What you can do

- **Anchor a single document** so its existence and timestamp are provable forever.
- **Batch anchor** up to ten documents in a single transaction.
- **Build a wallet history** through a per-principal registry of your anchors.
- **Mint a soulbound proof NFT** as a non-transferable token of an anchor.
- **Anchor collaboratively** in named groups, for a thesis committee or a research lab.
- **Verify** any document at `/v/<hash>` by re-hashing it in the browser.

## Where the truth lives

The Stacks blockchain is always the source of truth. ThesisLock reads anchors directly
from the public [Hiro Stacks API](https://api.mainnet.hiro.so). An optional Supabase
index mirrors anchor events for fast queries, but every result can be reproduced from the
chain itself. See [On-chain truth and the index](/concepts/on-chain-truth-and-the-index/).

## Canonical identifiers

| Item                | Value                                                |
| ------------------- | ---------------------------------------------------- |
| Deployer principal  | `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`          |
| Contract id format  | `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.<name>`   |
| Read API            | `https://api.mainnet.hiro.so`                        |
| Web app and REST API | `https://thesis-lock.vercel.app`                    |

## Next steps

- New here? Start with the [Quickstart](/quickstart/anchor-a-document/).
- Want the mental model first? Read [How proof of existence works](/introduction/how-proof-of-existence-works/).
- Building an integration? Jump to the [Reference](/reference/smart-contracts/).
