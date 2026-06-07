![CI](https://github.com/Tim-cryptow/thesis-lock/actions/workflows/ci.yml/badge.svg)

# ThesisLock

ThesisLock anchors a SHA-256 hash of any document on the Stacks blockchain, giving you a permanent, verifiable timestamp without ever exposing the file. Drop a document into the page, the browser hashes it locally, you sign a transaction with your Stacks wallet, and anyone can later visit a verification URL to confirm when it was anchored, by which wallet, and what label was attached.

## Live demo

- App: [thesis-lock.vercel.app](https://thesis-lock.vercel.app/)
- Deployer: [`SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`](https://explorer.hiro.so/address/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM?chain=mainnet)

## Features

- Single file anchoring with optional ASCII label up to 64 characters.
- Batch anchoring of up to ten files in a single transaction.
- Per-wallet anchor history at `/anchors`, populated automatically when you anchor.
- Anchor groups at `/groups`: create a named group, add members, and anchor documents under a shared, on-chain history. Useful for thesis committees, legal teams, or research labs collecting submissions.
- Client-side SHA-256 hashing. The file never leaves your device.
- Public verification at `/v/<hash>` with file re-upload check.
- Bulk verification at `/verify-bulk`: drop multiple files to check them all against the chain in one pass, with CSV export of results.
- Public feed at `/feed` showing recent on-chain anchor activity across all wallets, auto-refreshing every minute.
- Optional soulbound proof NFTs (SIP-009): mint a non-transferable token that stays in your wallet as permanent evidence of an anchor.

## Protocol

Five Clarity 3 contracts deployed to Stacks mainnet at the same principal, `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`:

| Contract | Purpose |
| --- | --- |
| [`thesislock`](https://explorer.hiro.so/txid/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock?chain=mainnet) | Original single-hash anchor. Stores `(buff 32) -> { anchored-by, stacks-block, burn-block, label }`. One anchor per hash, ever. |
| `thesislock-batch` | Anchors up to ten hashes per transaction, keyed by `{ hash, owner }`. Duplicates for the same owner are silently skipped so partial overlaps with prior batches still succeed. |
| `thesislock-registry` | Per-principal append-only index of anchors. Powers the "My Anchors" page. |
| `thesislock-proof` | SIP-009 NFT issuing soulbound proof tokens. `mint-proof` anchors a hash and mints a non-transferable token to the caller; `transfer` always fails with `u401`. One proof per unique hash (`u409` on duplicates). Look up by token id (`get-proof`) or hash (`get-proof-by-hash`). |
| [`thesislock-groups`](https://explorer.hiro.so/txid/0x4a698fca849d4c0ea7e28d020ab45ef1846c0e9fea39e128f3b48632473cd89a?chain=mainnet) | Named groups for collaborative anchoring. An admin creates a group (`create-group`) and manages members (`add-member`, `remove-member`, non-admin calls fail with `u403`). Any member can `anchor-to-group`, appending to a shared history keyed by `{ group-id, index }`. Read membership with `is-member` and history with `get-group-anchor-at` or `get-recent-group-anchors`. |

The original `thesislock` contract was first deployed at Stacks block 7798720, burn block 947300 ([deploy transaction](https://explorer.hiro.so/txid/0xd1bdda30d03befb0023c9e1c34e71a7429d5f1b699424f60481b3a64df8f5d8e?chain=mainnet)).

## Stack

- Clarity 3 smart contracts on Stacks mainnet
- Clarinet for project structure, testing, and deployment
- Next.js 16 App Router with TypeScript and Tailwind
- Stacks Connect for wallet integration (Leather, Xverse, Asigna)
- Hiro Stacks API for read-only contract calls
- Vercel for hosting

## Local development

```bash
# Contracts
npm install
clarinet check
npm test

# Frontend
cd web
npm install
cp .env.example .env.local
npm run dev
```

## Verify in the browser

The web UI has a verification page at `/v/<hash>`. Single anchors resolve automatically. Batch anchors are keyed by both hash and owner principal, so append `?owner=<principal>` to the URL when sharing a batch-anchored hash. Without the owner param the batch entry is only visible when the original anchoring wallet is connected, which defeats public verification:

```
https://thesis-lock.vercel.app/v/<hash>?owner=<principal>
```

Links generated from the "My Anchors" page and the batch success screen already include the owner.

## Verify on chain

You do not need the frontend to verify an anchor. Any SHA-256 hash can be looked up directly against the Hiro mainnet API.

Encode the 32-byte hash as a Clarity buffer by prefixing it with `0x0200000020` (type byte `02`, big-endian length `00000020`), then post it as a `get-anchor` argument:

```bash
HASH=0000000000000000000000000000000000000000000000000000000000000000

curl -sX POST \
  https://api.mainnet.hiro.so/v2/contracts/call-read/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM/thesislock/get-anchor \
  -H 'Content-Type: application/json' \
  --data "{\"sender\":\"SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM\",\"arguments\":[\"0x0200000020${HASH}\"]}"
```

The response is a serialized Clarity value:

| Result hex prefix | Meaning |
| --- | --- |
| `"result":"0x09"` | `none` — that hash has never been anchored |
| `"result":"0x0a0c..."` | `(some (tuple ...))` — anchored, fields follow |

To decode a `some` payload into JSON, deserialize with `@stacks/transactions`:

```bash
node -e '
const { deserializeCV, cvToJSON } = require("@stacks/transactions");
const hex = "0a0c0000000..."; // strip 0x, paste from API response
console.log(JSON.stringify(cvToJSON(deserializeCV(hex)), null, 2));
'
```

The decoded shape is `(optional (tuple (anchored-by principal) (stacks-block uint) (burn-block uint) (label (string-ascii 64))))`.

For a quick boolean check use `is-anchored` instead, which returns `0x03` for `true` and `0x04` for `false`:

```bash
curl -sX POST \
  https://api.mainnet.hiro.so/v2/contracts/call-read/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM/thesislock/is-anchored \
  -H 'Content-Type: application/json' \
  --data "{\"sender\":\"SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM\",\"arguments\":[\"0x0200000020${HASH}\"]}"
```

### Batch anchors

`thesislock-batch::get-batch-anchor` is keyed by both the hash and the owner principal, so you need to serialize the principal too. A standard mainnet principal is encoded as `0x05` (type byte for standard principal), followed by a one-byte version (`0x16` for mainnet), then the 20-byte hash160. The easiest path is to let `@stacks/transactions` do the encoding:

```bash
HASH=0000000000000000000000000000000000000000000000000000000000000000
OWNER=SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM

OWNER_HEX=$(node -e '
const { principalCV, serializeCV } = require("@stacks/transactions");
process.stdout.write("0x" + serializeCV(principalCV(process.argv[1])));
' "$OWNER")

curl -sX POST \
  https://api.mainnet.hiro.so/v2/contracts/call-read/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM/thesislock-batch/get-batch-anchor \
  -H 'Content-Type: application/json' \
  --data "{\"sender\":\"${OWNER}\",\"arguments\":[\"0x0200000020${HASH}\",\"${OWNER_HEX}\"]}"
```

The decoded shape is `(optional (tuple (label (string-ascii 64)) (stacks-block uint) (burn-block uint) (batch-id uint)))`.

### Registry counts

`thesislock-registry::get-anchor-count` returns the number of anchors a principal has registered. It takes a single principal argument:

```bash
OWNER=SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM
OWNER_HEX=$(node -e '
const { principalCV, serializeCV } = require("@stacks/transactions");
process.stdout.write("0x" + serializeCV(principalCV(process.argv[1])));
' "$OWNER")

curl -sX POST \
  https://api.mainnet.hiro.so/v2/contracts/call-read/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM/thesislock-registry/get-anchor-count \
  -H 'Content-Type: application/json' \
  --data "{\"sender\":\"${OWNER}\",\"arguments\":[\"${OWNER_HEX}\"]}"
```

The response is a `uint`. Use `get-anchor-at` (principal + uint index) or `get-recent-anchors` (principal) to read individual entries.

## REST API

For integrating ThesisLock verification into your own tools, CI pipelines, or submission systems, the app exposes a small JSON API that wraps the Clarity reads above. No Clarity serialization knowledge required. All endpoints send `Access-Control-Allow-Origin: *`, so they can be called directly from browser-based integrations.

Base URL: `https://thesis-lock.vercel.app`

### GET /api/verify/&lt;hash&gt;

Verify a single 64-character hex hash. Append `?owner=<principal>` to also check batch anchors, which are keyed by hash and owner.

```bash
curl -s https://thesis-lock.vercel.app/api/verify/9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06

# Batch anchor (include the owner principal)
curl -s "https://thesis-lock.vercel.app/api/verify/<hash>?owner=SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM"
```

### POST /api/verify

Same lookup over POST, taking a JSON body:

```bash
curl -s -X POST https://thesis-lock.vercel.app/api/verify \
  -H 'Content-Type: application/json' \
  -d '{"hash":"9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06"}'
```

Or upload a file and let the server compute its SHA-256 and verify it. The response includes the computed hash:

```bash
curl -s -X POST https://thesis-lock.vercel.app/api/verify \
  -F 'file=@thesis.pdf' \
  -F 'owner=SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM'
```

The file is hashed in memory and never stored.

### Response schema

A found anchor returns `verified: true`:

```json
{
  "verified": true,
  "source": "single",
  "hash": "9afe6f57...",
  "label": "project",
  "owner": "SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX",
  "stacksBlock": 8104143,
  "burnBlock": 951262,
  "contract": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock",
  "verifyUrl": "https://thesis-lock.vercel.app/v/9afe6f57..."
}
```

Batch anchors set `"source": "batch"` and add a `batchId`. File uploads add the computed `hash` under `computedHash`. A miss returns `200` with `verified: false`:

```json
{
  "verified": false,
  "hash": "0000...0000",
  "message": "Hash not found. For batch anchors, include ?owner=<principal>."
}
```

An invalid hash (not 64 hex characters) returns `400`.

### GET /api/health

Uptime probe. Returns the deployed contract identifiers and API version:

```bash
curl -s https://thesis-lock.vercel.app/api/health
```

```json
{
  "status": "ok",
  "contracts": {
    "thesislock": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock",
    "batch": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock-batch",
    "registry": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock-registry"
  },
  "version": "1.0.0"
}
```

## SDK

For programmatic verification in JavaScript or TypeScript projects, the `thesislock-sdk` package wraps the Clarity serialization and Hiro reads above. It verifies single and batch anchors, reads per-wallet history, and looks up proof NFTs, with no Clarity encoding knowledge required.

```bash
npm install thesislock-sdk
```

```ts
import { createClient } from 'thesislock-sdk';

const client = createClient();
const result = await client.verify('9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06');

if (result.verified) {
  console.log('Anchored by', result.data.anchoredBy);
}
```

The package lives in [`sdk/`](sdk/README.md), which has the full API reference, utility functions, and configuration options.
