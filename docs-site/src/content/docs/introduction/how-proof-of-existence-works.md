---
title: How proof of existence works
description: The hash, anchor, and verify lifecycle, and what ThesisLock records on chain.
sidebar:
  order: 2
---

Proof of existence is the ability to show that a specific piece of data existed at or
before a certain time. ThesisLock provides it with a three-step lifecycle: hash, anchor,
and verify.

## 1. Hash

A cryptographic hash function (SHA-256) turns any file into a fixed 64-character
hexadecimal digest. The same file always produces the same digest, and changing a single
byte produces a completely different one. SHA-256 is collision resistant, so it is not
feasible to craft a different document with the same hash.

ThesisLock computes this digest in your browser. The file is never uploaded, so the
hash alone stands in for the document.

## 2. Anchor

You sign a Stacks transaction that calls the `thesislock` contract and stores the hash on
chain. The contract records, alongside the hash:

- `anchored-by`: the principal (wallet) that signed the transaction.
- `stacks-block`: the Stacks block height at confirmation.
- `burn-block`: the Bitcoin block height that the Stacks block settled against.
- `label`: an optional ASCII label of up to 64 characters.

Once a hash is anchored, it cannot be anchored again in that contract, and the record is
permanent. The block heights are the timestamp: a block exists at a known point in time,
so anchoring proves the document existed by then.

## 3. Verify

To verify, re-compute the file's SHA-256 hash and read the on-chain record for that hash.
If a record exists, you learn who anchored it and at which block. ThesisLock does this for
you at `/v/<hash>`, where you can also drop the file in to confirm its hash matches the
one you are checking.

Anyone can verify, with no wallet and no account, because the data is public. You can
even bypass ThesisLock entirely and read the contract directly through the Hiro API:

```bash
curl -s -X POST \
  https://api.mainnet.hiro.so/v2/contracts/call-read/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM/thesislock/is-anchored \
  -H "Content-Type: application/json" \
  -d '{"sender":"SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM","arguments":["0x0200000020<your-32-byte-hash-hex>"]}'
```

The hash argument is a Clarity `(buff 32)` value: the type prefix `0x0200000020` followed
by the 64-character hex digest. The [SDK](/reference/sdk/) and [CLI](/reference/cli/)
handle this encoding for you.

## Why a hash is enough

You do not need to publish a document to prove it existed. If you keep the original file,
you can always re-hash it and show that the digest matches an anchor created at a known
time. If the file changes by even one byte, the hash will not match, which is exactly the
property that makes the proof meaningful.
