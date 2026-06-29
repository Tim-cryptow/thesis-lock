---
title: Blocks, timestamps, and finality
description: How block heights become timestamps and what finality means for an anchor.
sidebar:
  order: 4
---

An anchor's timestamp comes from the block it was confirmed in. This page explains how
ThesisLock records time and what makes an anchor final.

## Two block heights

Each anchor stores two heights:

- **Stacks block** (`stacks-block`): the Stacks chain height at confirmation. ThesisLock
  uses Clarity's `stacks-block-height`.
- **Burn block** (`burn-block`): the Bitcoin block height the Stacks block settled
  against, from Clarity's `burn-block-height`.

A block exists at a known point in time, so its height acts as a timestamp. Because Stacks
settles to Bitcoin, the burn block ties an anchor to Bitcoin's timeline as well as
Stacks'.

## Turning a height into a time

To display a human-readable timestamp, ThesisLock looks up the block's time from the Hiro
API (for example, the `block_time_iso` field of a block). The CLI's `getBlockTime` helper
does the same. The block height is the durable fact stored on chain; the wall-clock time
is derived from it at read time.

As a rough guide, Stacks produces blocks on the order of minutes, so a difference of N
blocks is roughly N times the average block time. The app uses an estimate like this when
comparing two anchors, but the authoritative value is always the block height.

## Finality

A Stacks transaction is final once it is mined into a block and that block settles to
Bitcoin. After that, the anchor cannot be changed or removed: the contracts have no
function to edit or delete a record, and deployed Clarity contracts cannot be modified in
place.

The practical implication: the longer ago an anchor was created, the more Bitcoin work
sits on top of it, and the more expensive it would be to dispute. For a proof-of-existence
timestamp, older is stronger.

## Ordering within a contract

The registry and groups contracts keep an incrementing index per owner or per group, so
entries have a stable order independent of wall-clock time. "Recent" lists return the
newest entries first by walking that index backward.
