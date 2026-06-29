---
title: On-chain truth and the index
description: Why the blockchain is the source of truth and how the optional Supabase index fits in.
sidebar:
  order: 3
---

Every ThesisLock result can be traced back to the Stacks blockchain. An optional index
makes reads fast, but it never becomes the source of truth.

## The chain is authoritative

Anchors live in the Clarity contracts on Stacks mainnet. The canonical way to read one is a
read-only contract call through the public [Hiro Stacks API](https://api.mainnet.hiro.so).
Anyone can make that call and get the same answer, which is what lets a verifier trust a
result without trusting ThesisLock.

The [SDK](/reference/sdk/), [CLI](/reference/cli/), and [GitHub Action](/reference/github-action/)
all read this way: they call the contracts directly and decode the result.

## The optional index

Reading large histories or searching by label is slow if every query hits the chain. To
make the web app responsive, ThesisLock can mirror anchor events into a Supabase table
called `thesis_locks`. A [Hiro Chainhook](https://docs.hiro.so/chainhook) streams the
contracts' `print` events to the `/api/chainhooks` endpoint, which writes them to the
table.

The index only ever holds public on-chain data: transaction id, block heights, sender,
hash, label, and the raw event. It is a cache and a query accelerator, not a separate
record of truth.

## Reorg awareness

Chainhook delivers events as `apply` and `rollback` sets. The ingestion endpoint applies
new events idempotently (keyed on transaction id, so redelivery is safe) and marks rolled
back events as reverted. This keeps the index consistent with the canonical chain even
when blocks are reorganized.

## Fallback to the chain

When the index is unavailable, or a hash was anchored so recently it has not been indexed
yet, the app falls back to reading directly from the Hiro API. A verification result is
therefore never blocked on the index being present or current.

## What this means for you

- If you need the strongest guarantee, read the contracts directly (the SDK, CLI, and
  Action already do).
- If you are building a dashboard or search over many anchors, the index or the
  [REST API](/reference/rest-api/) that sits in front of it will be faster.
- Either way, the same anchor exists on chain, and anyone can reproduce the result.
