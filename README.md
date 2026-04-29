# ThesisLock

ThesisLock anchors a SHA-256 hash of any document on the Stacks blockchain, giving you a permanent, verifiable timestamp without ever exposing the file. Drop a document into the page, the browser hashes it locally, you sign a transaction with your Stacks wallet, and anyone can later visit a verification URL to confirm when it was anchored, by which wallet, and what label was attached.

## Live demo

- App: [thesis-lock.vercel.app](https://thesis-lock.vercel.app/)
- Contract: [`SP2CJBNE5DMQA3KS2S2AAE0AW8BZDS33RXCBTXPQM.thesislock`](https://explorer.hiro.so/txid/SP2CJBNE5DMQA3KS2S2AAE0AW8BZDS33RXCBTXPQM.thesislock?chain=mainnet)
- Deploy transaction: [`0x2ba6cc78...1bd6c7be`](https://explorer.hiro.so/txid/0x2ba6cc78561a6992f17a2c41c452ac84467dc3021d74b9bccf637fef1bd6c7be?chain=mainnet) (Stacks block 7785628, burn block 947123)

## Stack

- Clarity 3 smart contract on Stacks mainnet
- Clarinet for project structure, testing, and deployment
- Next.js 14 App Router with TypeScript and Tailwind
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
