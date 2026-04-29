# ThesisLock

ThesisLock anchors a SHA-256 hash of any document on the Stacks blockchain, giving you a permanent, verifiable timestamp without ever exposing the file. Drop a document into the page, the browser hashes it locally, you sign a transaction with your Stacks wallet, and anyone can later visit a verification URL to confirm when it was anchored, by which wallet, and what label was attached.

## Live demo

- App: [thesis-lock.vercel.app](https://thesis-lock.vercel.app/)
- Contract: [`SP2CJBNE5DMQA3KS2S2AAE0AW8BZDS33RXCBTXPQM.thesislock`](https://explorer.hiro.so/txid/SP2CJBNE5DMQA3KS2S2AAE0AW8BZDS33RXCBTXPQM.thesislock?chain=mainnet)
- Deploy transaction: [`0x2ba6cc78...1bd6c7be`](https://explorer.hiro.so/txid/0x2ba6cc78561a6992f17a2c41c452ac84467dc3021d74b9bccf637fef1bd6c7be?chain=mainnet) (Stacks block 7785628, burn block 947123)

## Stack

- Clarity 3 smart contract on Stacks mainnet
- Clarinet for project structure, testing, and deployment
- Next.js 16 App Router with TypeScript and Tailwind
- Stacks Connect for wallet integration (Leather, Xverse, Asigna)
- Hiro Stacks API for read-only contract calls
- Vercel for hosting

## Local development

```bash
# Contract
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
  https://api.mainnet.hiro.so/v2/contracts/call-read/SP2CJBNE5DMQA3KS2S2AAE0AW8BZDS33RXCBTXPQM/thesislock/get-anchor \
  -H 'Content-Type: application/json' \
  --data "{\"sender\":\"SP2CJBNE5DMQA3KS2S2AAE0AW8BZDS33RXCBTXPQM\",\"arguments\":[\"0x0200000020${HASH}\"]}"
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
  https://api.mainnet.hiro.so/v2/contracts/call-read/SP2CJBNE5DMQA3KS2S2AAE0AW8BZDS33RXCBTXPQM/thesislock/is-anchored \
  -H 'Content-Type: application/json' \
  --data "{\"sender\":\"SP2CJBNE5DMQA3KS2S2AAE0AW8BZDS33RXCBTXPQM\",\"arguments\":[\"0x0200000020${HASH}\"]}"
```
