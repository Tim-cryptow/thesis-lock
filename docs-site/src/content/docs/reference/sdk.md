---
title: SDK
description: The thesislock-sdk package for verifying ThesisLock anchors in JavaScript and TypeScript.
sidebar:
  order: 3
---

`thesislock-sdk` is a read-only JavaScript and TypeScript SDK for verifying ThesisLock
anchors. It wraps the Clarity serialization and the Hiro read-only API so you can verify a
hash, read wallet history, and look up proof NFTs without handling Clarity encoding
yourself. Creating anchors needs a wallet and is done in the web app.

## Installation

```bash
npm install thesislock-sdk
```

The SDK targets Node.js 18 or newer (it uses the global `fetch` and `node:crypto`).

## Quick start

```ts
import { createClient } from "thesislock-sdk";

const client = createClient();
const result = await client.verify(
  "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06",
);

if (result.verified) {
  console.log("Anchored by", result.data.anchoredBy, "at block", result.data.stacksBlock);
}
```

## Configuration

`createClient(config?)` and `new ThesisLockClient(config?)` accept an optional config:

| Option            | Default                                     | Description                                          |
| ----------------- | ------------------------------------------- | ---------------------------------------------------- |
| `apiUrl`          | `https://api.mainnet.hiro.so`               | Base URL of the Hiro Stacks API for read-only calls. |
| `contractAddress` | `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM` | Principal that deployed the contracts.               |
| `network`         | `mainnet`                                   | `mainnet` or `testnet`; selects the default `apiUrl`.|

```ts
import { ThesisLockClient } from "thesislock-sdk";

const client = new ThesisLockClient({ network: "mainnet" });
```

All methods return Promises and call the Hiro read-only API. A failed network call or a
contract-level rejection throws an `Error`. A plain "not found" is not an error: lookups
resolve to an unverified result or `null`.

## Verification

### `verify(hash)`

Looks up a single anchor in the `thesislock` contract.

```ts
const result = await client.verify(hash);
// { verified: true, source: "single", data: AnchorResult }
// or { verified: false, source: null, data: null }
```

### `verifyBatch(hash, owner)`

Looks up an owner-keyed batch anchor in `thesislock-batch`. Batch anchors are keyed by both
the hash and the owner, so `owner` is required. Throws if `owner` is not a valid principal.

```ts
const result = await client.verifyBatch(hash, "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM");
// { verified: true, source: "batch", data: BatchAnchorResult }
```

### `verifyAny(hash, owner?)`

Tries the single anchor first, then the owner-keyed batch anchor when an `owner` is given.
Returns the first match, or an unverified result.

```ts
const result = await client.verifyAny(hash, owner);
```

## Registry

### `getAnchorCount(owner)`

Returns how many anchors a principal has registered in `thesislock-registry`.

```ts
const count = await client.getAnchorCount(owner); // number
```

### `getRecentAnchors(owner)`

Returns up to the ten most recent registry entries for a principal, newest first.

```ts
const entries = await client.getRecentAnchors(owner); // RegistryEntry[]
```

## Proof NFTs

### `getProof(tokenId)`

Reads a soulbound proof NFT by token id from `thesislock-proof`. Returns `null` when the
token does not exist. Throws on a negative or non-integer token id.

```ts
const proof = await client.getProof(1); // ProofNFT | null
```

### `getProofByHash(hash)`

Resolves a proof NFT from the hash it anchors. Returns `null` when no proof exists.

```ts
const proof = await client.getProofByHash(hash); // ProofNFT | null
```

## Utilities

These are exported at the top level and need no client.

| Function                    | Description                                                                 |
| --------------------------- | --------------------------------------------------------------------------- |
| `hashString(input)`         | Lowercase 64-character hex SHA-256 of a string's UTF-8 bytes.               |
| `hashFile(file)`            | Lowercase 64-character hex SHA-256 of a `File` or `Buffer` (async).         |
| `isValidHash(hash)`         | `true` if the input is 64 hex chars (an optional `0x` and uppercase are ok).|
| `serializeHash(hex)`        | Encodes a hash as a serialized Clarity `(buff 32)` value (no `0x` prefix).  |
| `truncateHash(hash, chars?)`| Shortens a hash to its first and last `chars` characters (default 8).       |

```ts
import { hashFile, isValidHash } from "thesislock-sdk";
import { readFileSync } from "node:fs";

const hash = await hashFile(readFileSync("thesis.pdf"));
if (isValidHash(hash)) {
  // ...
}
```

## Types

All record and result types are exported for TypeScript projects.

```ts
interface AnchorResult {
  hash: string;
  label: string;
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
}

interface BatchAnchorResult {
  hash: string;
  owner: string;
  label: string;
  stacksBlock: number;
  burnBlock: number;
  batchId: number;
}

interface RegistryEntry {
  hash: string;
  label: string;
  anchoredAt: number;
}

interface ProofNFT {
  tokenId: number;
  hash: string;
  label: string;
  anchoredBy: string;
  stacksBlock: number;
  burnBlock: number;
}

type VerifySource = "single" | "batch" | "proof";

type VerifyResult =
  | { verified: true; source: "single"; data: AnchorResult }
  | { verified: true; source: "batch"; data: BatchAnchorResult }
  | { verified: false; source: null; data: null };
```

`VerifyResult` is discriminated on `verified` and `source`, so checking `result.verified`
narrows `data` to the matching record with no casts. `ThesisLockConfig`, `SingleVerifyResult`,
and `BatchVerifyResult` are exported too.

## Error handling

A failed network request or a contract-level rejection throws; a plain "not found" does
not. Wrap calls in `try`/`catch` for outages, and check `verified` (or a `null` return) for
the not-found case.

```ts
import { createClient } from "thesislock-sdk";

const client = createClient();

try {
  const result = await client.verify(hash);
  if (result.verified) {
    console.log("Anchored at block", result.data.stacksBlock);
  } else {
    console.log("Not anchored");
  }
} catch (err) {
  console.error("Lookup failed:", err);
}
```

`verifyBatch`, `getAnchorCount`, and `getRecentAnchors` also throw on an invalid principal,
and `getProof` throws on a negative or non-integer token id.
