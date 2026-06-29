---
title: Anchors, batches, registry, proofs, and groups
description: The five ThesisLock contracts, what each one is for, and when to use it.
sidebar:
  order: 1
  label: Overview
---

ThesisLock is made of five Clarity contracts. Each handles a different way of recording
an anchor. They share the same idea (store a SHA-256 hash on chain) but differ in keying,
history, and collaboration. This page explains the model. For exact signatures and error
codes, see the [smart contract reference](/reference/smart-contracts/).

## thesislock: single anchors

The core contract. It stores one record per hash, keyed by the hash alone, so a given
hash can be anchored once across the whole contract. Each record holds the signer, the
Stacks and Bitcoin block heights, and an optional label. This is the simplest and most
common anchor: "this exact document existed by this time."

Use it when you want a single, globally unique timestamp for a document.

## thesislock-batch: batch anchors

Anchors up to ten hashes in a single transaction. Records are keyed by both the hash and
the owner principal, so the same hash can be batch-anchored independently by different
wallets, and a verification link must include the owner. Anchoring the same hash twice for
the same owner is silently skipped.

Use it when you want to timestamp several documents together and save on transactions.

## thesislock-registry: per-wallet history

An append-only, per-principal index of anchors. Each entry stores a hash, a label, and the
block it was recorded at, under an incrementing index for the owner. This is what powers a
wallet's anchor history without an off-chain database. You can read a wallet's anchor count
and its ten most recent entries, newest first.

Use it to build "my anchors" views and wallet profiles.

## thesislock-proof: soulbound proof NFTs

Mints a non-transferable SIP-009 NFT that represents an anchor. The token stays in the
minter's wallet as permanent evidence. Each unique hash can back at most one proof token,
and transfers are always rejected (the token is soulbound).

Use it when you want a wallet-held, collectible token of an anchor, for example to display
in a wallet or marketplace that reads SIP-009 metadata.

## thesislock-groups: collaborative anchoring

Named groups for collaborative anchoring. An admin creates a group and adds members; any
member can anchor hashes under the group, building a shared, ordered history. Useful for a
thesis committee collecting drafts, a legal team organizing filings, or a research lab
timestamping datasets.

Use it when several people should contribute to one shared timeline of anchors.

## How they fit together

| Contract             | Keyed by         | History       | Special property               |
| -------------------- | ---------------- | ------------- | ------------------------------ |
| `thesislock`         | hash             | none          | globally unique hash           |
| `thesislock-batch`   | hash + owner     | none          | up to 10 per transaction       |
| `thesislock-registry`| owner + index    | per wallet    | ordered "my anchors" list      |
| `thesislock-proof`   | token id, hash   | none          | soulbound SIP-009 NFT          |
| `thesislock-groups`  | group id + index | per group     | admin and members              |

The web app uses several of these together. For example, anchoring a single document also
registers it in the registry so it shows up in your history.
