---
title: The privacy model
description: What ThesisLock publishes, what it keeps local, and why your documents stay private.
sidebar:
  order: 4
---

ThesisLock is built so that your documents never leave your device. This page explains
exactly what is published and what is not.

## The document never leaves your device

Hashing happens in the browser. When you anchor or verify a file, the page reads it
locally, computes a SHA-256 digest, and only ever sends or stores that digest. There is
no file upload step, and no server receives the bytes of your document.

## What is published on chain

When you anchor, the only data written to the blockchain is:

- the **SHA-256 hash** (a 64-character hex digest),
- the **wallet** that signed the transaction,
- the **block heights** at confirmation, and
- an optional **label** you choose.

A hash reveals nothing about the contents of a file. Given only a digest, you cannot
reconstruct the document or learn anything about it. The label is the one piece of
human-readable metadata, and it is entirely optional, so keep it generic if the title
itself is sensitive.

## What stays in your browser

Many app features are conveniences that run entirely client-side and never reach a
server. Collections, tags, favorites, the watchlist, the audit log, notifications, and
performance metrics are all stored in your browser's `localStorage`. They are visible
only to you, do not sync across devices, and are cleared if you clear site data. You can
export and restore them from the settings page.

## How reads work

Verification and lookups read public data from the [Hiro Stacks API](https://api.mainnet.hiro.so).
An optional Supabase index mirrors anchor events to make queries fast, but it only ever
holds public on-chain data (hashes, principals, labels, block heights), and the chain
remains the source of truth. See
[On-chain truth and the index](/concepts/on-chain-truth-and-the-index/).

## Practical guidance

- The hash is safe to share publicly. That is the point: anyone can verify it.
- Treat the **label** as public. Do not put secrets in it.
- Keep your **original file** safe. Proof of existence depends on being able to
  re-hash the exact file later. If the file is lost or altered, you can no longer produce
  a matching hash.
