# ThesisLock

ThesisLock anchors a SHA-256 hash of any document on the Stacks blockchain, giving you a permanent, verifiable timestamp without ever exposing the file. Drop a document into the page, the browser hashes it locally, you sign a transaction with your Stacks wallet, and anyone can later visit a verification URL to confirm when it was anchored, by which wallet, and what label was attached.

## Live demo

- App: [thesis-lock.vercel.app](https://thesis-lock.vercel.app/)
- Deployer: [`SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`](https://explorer.hiro.so/address/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM?chain=mainnet)

## Features

- Single file anchoring with optional ASCII label up to 64 characters.
- Batch anchoring of up to ten files in a single transaction.
- Per-wallet anchor history at `/anchors`, populated automatically when you anchor.
- Client-side SHA-256 hashing. The file never leaves your device.
- Public verification at `/v/<hash>` with file re-upload check.

## Protocol

Three Clarity 3 contracts deployed to Stacks mainnet at the same principal, `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`:

| Contract | Purpose |
| --- | --- |
| [`thesislock`](https://explorer.hiro.so/txid/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock?chain=mainnet) | Original single-hash anchor. Stores `(buff 32) -> { anchored-by, stacks-block, burn-block, label }`. One anchor per hash, ever. |
| `thesislock-batch` | Anchors up to ten hashes per transaction, keyed by `{ hash, owner }`. Duplicates for the same owner are silently skipped so partial overlaps with prior batches still succeed. |
| `thesislock-registry` | Per-principal append-only index of anchors. Powers the "My Anchors" page. |

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
