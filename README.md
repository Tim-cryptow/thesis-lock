# ThesisLock

ThesisLock anchors a SHA-256 hash of any document on the Stacks blockchain, giving you a permanent, verifiable timestamp without ever exposing the file. Drop a document into the page, the browser hashes it locally, you sign a transaction with your Stacks wallet, and anyone can later visit a verification URL to confirm when it was anchored, by which wallet, and what label was attached.

## Live demo

- App: _to be filled in after Vercel deploy_
- Contract: _to be filled in after mainnet deploy_

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
