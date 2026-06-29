---
title: Anchoring documents
description: Single anchors, batch anchoring, structured label templates, and proof NFTs.
sidebar:
  order: 2
---

There is more than one way to anchor, depending on whether you are timestamping one file or
many, and whether you want a wallet-held token of the anchor.

## Single anchors

The default. Drop a file on the [anchor page](https://thesis-lock.vercel.app), optionally
add a label, and sign. This calls `anchor-document` on the `thesislock` contract. A single
anchor also registers an entry in the registry, so it shows up in your
[history](/guides/organizing-your-anchors/). See the
[quickstart](/quickstart/anchor-a-document/) for the full walkthrough.

## Labels and templates

A label is up to 64 ASCII characters of optional, public metadata. You can type a free-form
label, or use a template to produce a structured one.

Templates format a label as a prefix plus `key:value` pairs joined by `|`, for example:

```
paper-title:my-thesis|v:2|dept:biology
```

Built-in templates include Generic, Paper, Legal, Release, Dataset, and Certificate.
Empty optional fields are skipped, whitespace is collapsed to dashes, and the `|` and `:`
characters are removed from values so the label stays well-formed. You can open the anchor
form with a template preselected using a deep link such as `/anchor?template=paper`.

Because labels are public and parseable, tools like [compare](/guides/verifying-documents/)
and wallet profiles can read template fields back out.

## Batch anchoring

To timestamp several documents at once, use batch anchoring. You can include up to ten
files in a single transaction, which calls `anchor-batch` on the `thesislock-batch`
contract.

Batch records are keyed by both the hash and your wallet, so:

- the same hash can be batch-anchored independently by different wallets, and
- verification links for batch anchors include the owner: `/v/<hash>?owner=<principal>`.

Anchoring the same hash twice for the same wallet is silently skipped, so re-running a batch
is safe.

## Proof NFTs

A proof NFT is a soulbound (non-transferable) SIP-009 token that represents an anchor.
Minting one calls `mint-proof` on the `thesislock-proof` contract, which records the hash
and issues a token to your wallet. Each unique hash can back at most one proof token, and
any attempt to transfer the token is rejected.

Proof NFT metadata is served at `/api/nft/<id>`, so wallets and marketplaces that read
SIP-009 metadata can display it. Use a proof NFT when you want a wallet-held, collectible
token of an anchor rather than just a contract record.

## Which should I use?

- One document, simplest record: **single anchor**.
- Several documents together, fewer transactions: **batch anchor**.
- A wallet-held token of the anchor: **proof NFT**.
- A shared timeline across people: **[groups](/guides/collaborative-groups/)**.
