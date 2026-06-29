---
title: Why Stacks and Bitcoin
description: How ThesisLock anchors inherit Bitcoin finality, and the difference between Stacks and Bitcoin block heights.
sidebar:
  order: 3
---

ThesisLock anchors documents on [Stacks](https://www.stacks.org/), a blockchain that
settles to Bitcoin. This choice shapes how durable and verifiable an anchor is.

## Settlement to Bitcoin

Stacks blocks are anchored to the Bitcoin blockchain. Each Stacks block references a
Bitcoin block, so the history of Stacks is tied to the history of Bitcoin. For a
proof-of-existence timestamp, this matters: the further back an anchor is, the more
Bitcoin work sits on top of it, and the harder it is to dispute.

Every ThesisLock anchor stores two block heights:

- **Stacks block** (`stacks-block`): the height of the Stacks block at confirmation.
- **Burn block** (`burn-block`): the height of the Bitcoin block the Stacks block
  settled against. "Burn" refers to the Bitcoin that miners commit in the Stacks
  consensus mechanism.

Recording both means a verifier can map an anchor to a point in Bitcoin's timeline, not
only Stacks'.

## Clarity contracts

ThesisLock's logic lives in [Clarity](https://clarity-lang.org/) smart contracts. Clarity
is decidable and has no compiler step that hides behavior: the source you read is the
logic that runs. The contracts are deployed once and cannot be edited in place, which is
what makes an anchor permanent. See the [smart contract reference](/reference/smart-contracts/)
for exact signatures.

## Public, permissionless reads

Anchors are public. Reading them needs no wallet, no API key, and no account. ThesisLock
reads through the public [Hiro Stacks API](https://api.mainnet.hiro.so), and so can you,
your scripts, or your CI pipeline. That openness is what lets a verifier trust a result
without trusting ThesisLock: the same query against the same chain returns the same
answer for everyone.

## What this is not

ThesisLock proves that a hash existed at a time and was anchored by a wallet. It does not
prove authorship, ownership, or the truth of a document's contents. It is a timestamp and
an integrity check, not a notary's judgement about meaning.
