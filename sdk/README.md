# ThesisLock SDK

JavaScript and TypeScript SDK for verifying [ThesisLock](https://thesis-lock.vercel.app/) document anchors on the Stacks blockchain. It wraps the Clarity serialization and the Hiro read-only API so you can verify a document hash, read per-wallet anchor history, and look up soulbound proof NFTs without touching Clarity value encoding yourself.

ThesisLock anchors a SHA-256 hash of a document on chain, giving a permanent, verifiable timestamp without ever exposing the file. This package is read-only: it verifies existing anchors. Creating anchors requires a wallet and is done through the web app.

## Installation

```bash
npm install thesislock-sdk
```

The SDK targets Node.js 18 or newer (it relies on the global `fetch` and `node:crypto`).

## Quick start

```ts
import { createClient } from 'thesislock-sdk';

const client = createClient();
const result = await client.verify('9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06');

if (result.verified) {
  console.log('Anchored by', result.data.anchoredBy);
  console.log('Stacks block', result.data.stacksBlock);
}
```

## Configuration

`createClient(config?)` and `new ThesisLockClient(config?)` accept an optional config object:

| Option | Default | Description |
| --- | --- | --- |
| `apiUrl` | `https://api.mainnet.hiro.so` | Base URL of the Hiro Stacks API used for read-only calls. |
| `contractAddress` | `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM` | Principal that deployed the ThesisLock contracts. |
| `network` | `mainnet` | Network label, `mainnet` or `testnet`. |

```ts
import { ThesisLockClient } from 'thesislock-sdk';

const client = new ThesisLockClient({
  apiUrl: 'https://api.mainnet.hiro.so',
  contractAddress: 'SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM',
});
```

## Client API

All methods return Promises and call the Hiro read-only API. A failed network call or a contract-level rejection throws an `Error`. A simple "not found" is not an error: lookups resolve to an unverified result or `null`.

### verify(hash)

Looks up a single anchor in the `thesislock` contract.

```ts
const result = await client.verify(hash);
// { verified: true, source: 'single', data: AnchorResult }
// or { verified: false, source: null, data: null }
```

### verifyBatch(hash, owner)

Looks up an owner-keyed batch anchor in `thesislock-batch`. Batch anchors are keyed by both the hash and the owner principal, so the owner is required. Throws if `owner` is not a valid Stacks principal.

```ts
const result = await client.verifyBatch(hash, 'SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM');
// { verified: true, source: 'batch', data: BatchAnchorResult }
```

### verifyAny(hash, owner?)

Tries the single anchor first, then the owner-keyed batch anchor when an `owner` is provided. Returns the first match, or an unverified result.

```ts
const result = await client.verifyAny(hash, owner);
```

### getAnchorCount(owner)

Returns the number of anchors a principal has registered in `thesislock-registry`.

```ts
const count = await client.getAnchorCount('SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM');
```

### getRecentAnchors(owner)

Returns up to the ten most recent registry entries for a principal, newest first.

```ts
const entries = await client.getRecentAnchors(owner);
// RegistryEntry[]
```

### getProof(tokenId)

Reads a soulbound proof NFT by token id from `thesislock-proof`. Returns `null` when the token does not exist.

```ts
const proof = await client.getProof(1);
// ProofNFT | null
```

### getProofByHash(hash)

Resolves a proof NFT from the hash it anchors. Returns `null` when no proof exists for the hash.

```ts
const proof = await client.getProofByHash(hash);
// ProofNFT | null
```

## Utility functions

These are exported at the top level and do not require a client.

### hashString(input)

Returns the lowercase 64-character hex SHA-256 digest of a string's UTF-8 bytes.

```ts
import { hashString } from 'thesislock-sdk';
const hash = hashString('hello world');
```

### hashFile(file)

Returns the lowercase 64-character hex SHA-256 digest of a `File` or a `Buffer`.

```ts
import { hashFile } from 'thesislock-sdk';
import { readFileSync } from 'node:fs';

const hash = await hashFile(readFileSync('thesis.pdf'));
```

### isValidHash(hash)

Returns `true` when the input is exactly 64 hex characters. An optional `0x` prefix and uppercase hex are accepted.

### serializeHash(hex)

Encodes a 64-character hex hash as a serialized Clarity `(buff 32)` value, ready to pass as a contract-call argument. Returns hex without a `0x` prefix.

```ts
import { serializeHash } from 'thesislock-sdk';
serializeHash('9afe6f57...'); // '02000000209afe6f57...'
```

### truncateHash(hash, chars?)

Shortens a hash to its first and last `chars` characters (default 8) for display.

```ts
import { truncateHash } from 'thesislock-sdk';
truncateHash('9afe6f57...585d06', 4); // '9afe...5d06'
```

## Types

`AnchorResult`, `BatchAnchorResult`, `RegistryEntry`, `ProofNFT`, and `VerifyResult` are all exported for use in TypeScript projects.

`VerifyResult` is a discriminated union, so checking `result.verified` narrows `data` to the matching record with no casts. `verify()` returns a single-anchor result, `verifyBatch()` a batch result, and `verifyAny()` the combined `VerifyResult`.

```ts
type VerifyResult =
  | { verified: true; source: 'single'; data: AnchorResult }
  | { verified: true; source: 'batch'; data: BatchAnchorResult }
  | { verified: false; source: null; data: null };

const result = await client.verify(hash);
if (result.verified) {
  result.data.anchoredBy; // narrowed to AnchorResult
}
```

## License

MIT
