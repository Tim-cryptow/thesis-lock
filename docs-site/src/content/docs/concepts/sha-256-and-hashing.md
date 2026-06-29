---
title: The SHA-256 model
description: Why a hash is enough to prove a document existed, and how ThesisLock uses SHA-256.
sidebar:
  order: 2
---

ThesisLock identifies every document by its SHA-256 hash. Understanding what that hash is,
and is not, explains the whole system.

## What a hash is

SHA-256 is a cryptographic hash function. It maps any input, of any size, to a fixed
256-bit output, written as a 64-character hexadecimal string. Two properties make it
useful here:

- **Deterministic:** the same bytes always produce the same digest.
- **Collision resistant:** it is not feasible to find two different inputs with the same
  digest, nor to construct an input that matches a given digest.

Together, these mean a digest is a stable, unique fingerprint of a file. If you have the
file, you can prove it matches a digest. If you change the file at all, the digest changes.

## How ThesisLock uses it

The hash is computed in your browser (or locally by the CLI, SDK, or Action) and only the
digest is published. On chain, the hash is stored as a Clarity `(buff 32)`: 32 raw bytes.
When serialized for a contract call, a `(buff 32)` is the type prefix `0x0200000020`
(type byte `0x02`, then the 4-byte big-endian length `0x00000020` = 32) followed by the
64-character hex digest.

You rarely need to handle this encoding yourself. The [SDK](/reference/sdk/) exposes
`serializeHash()` and `hashFile()`, and the [CLI](/reference/cli/) and
[GitHub Action](/reference/github-action/) do it internally.

## What the hash does not tell you

A digest reveals nothing about a document's contents. Given only the hash, you cannot
recover the file or learn anything about it. This is what keeps documents private while
still letting anyone verify them.

It also does not prove authorship or ownership. It proves that the exact bytes that
produce that digest existed by the time of the anchor, and that a particular wallet
recorded them. Meaning, authorship, and rights are outside what a hash can show.

## Practical notes

- Always keep the original file. Proof of existence depends on being able to re-hash the
  exact bytes later.
- Hashes are case-insensitive hex. ThesisLock normalizes them to lowercase, and accepts an
  optional `0x` prefix on input.
- A 64-character hex string is treated as a hash everywhere in the app, the CLI, and the
  API.
