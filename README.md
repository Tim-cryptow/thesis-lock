![CI](https://github.com/Tim-cryptow/thesis-lock/actions/workflows/ci.yml/badge.svg)

# ThesisLock

ThesisLock anchors a SHA-256 hash of any document on the Stacks blockchain, giving you a permanent, verifiable timestamp without ever exposing the file. Drop a document into the page, the browser hashes it locally, you sign a transaction with your Stacks wallet, and anyone can later visit a verification URL to confirm when it was anchored, by which wallet, and what label was attached.

## Live demo

- App: [thesis-lock.vercel.app](https://thesis-lock.vercel.app/)
- Docs: [thesis-lock.vercel.app/docs](https://thesis-lock.vercel.app/docs)
- Deployer: [`SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`](https://explorer.hiro.so/address/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM?chain=mainnet)

## Features

- Single file anchoring with optional ASCII label up to 64 characters.
- Batch anchoring of up to ten files in a single transaction.
- Per-wallet anchor history at `/anchors`, populated automatically when you anchor.
- Anchor groups at `/groups`: create a named group, add members, and anchor documents under a shared, on-chain history.
- Client-side SHA-256 hashing. The file never leaves your device.
- Public verification at `/v/<hash>` with file re-upload check, plus bulk verification at `/verify-bulk`.
- Public feed at `/feed` and cross-contract search at `/search`.
- Embeddable badges at `/embed`: a shields-style "Verified on Stacks" SVG badge (`/api/badge/<hash>`) and a social sharing card (`/api/card/<hash>`) for any anchored hash.
- Optional soulbound proof NFTs (SIP-009) as permanent in-wallet evidence of an anchor.

## Protocol

Five Clarity 3 contracts deployed to Stacks mainnet at the same principal, `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`:

| Contract | Purpose |
| --- | --- |
| [`thesislock`](https://explorer.hiro.so/txid/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock?chain=mainnet) | Original single-hash anchor. One immutable record per hash. |
| `thesislock-batch` | Anchors up to ten hashes per transaction, keyed by `{ hash, owner }`. |
| `thesislock-registry` | Per-principal append-only index of anchors. Powers "My Anchors". |
| `thesislock-proof` | SIP-009 NFT issuing soulbound proof tokens. |
| [`thesislock-groups`](https://explorer.hiro.so/txid/0x4a698fca849d4c0ea7e28d020ab45ef1846c0e9fea39e128f3b48632473cd89a?chain=mainnet) | Named groups for collaborative anchoring under a shared history. |

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

## Documentation

Full guides and reference live at [thesis-lock.vercel.app/docs](https://thesis-lock.vercel.app/docs):

- [Getting Started](https://thesis-lock.vercel.app/docs/getting-started): what ThesisLock is and how to anchor your first document.
- [Contracts](https://thesis-lock.vercel.app/docs/contracts): all five contracts, function signatures, and direct Hiro API calls.
- [Web App Guide](https://thesis-lock.vercel.app/docs/web-app): anchoring, batches, groups, verification, and proof NFTs.
- [API Reference](https://thesis-lock.vercel.app/docs/api): the JSON REST API for verification, search, stats, badges, and cards.
- [SDK Guide](https://thesis-lock.vercel.app/docs/sdk): the `thesislock-sdk` TypeScript package ([`sdk/`](sdk/README.md)).
- [CLI Guide](https://thesis-lock.vercel.app/docs/cli): the `thesislock-cli` terminal tool ([`cli/`](cli/README.md)).
- [GitHub Action](https://thesis-lock.vercel.app/docs/github-action): gate a CI pipeline on an on-chain anchor ([`action/`](action/README.md)).
