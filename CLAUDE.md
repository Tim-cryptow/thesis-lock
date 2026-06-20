# ThesisLock

## Project overview

ThesisLock is a hash-anchor service for academic and creative documents on the Stacks blockchain. A user drops a file into the web UI, the browser hashes it with SHA-256 client-side (the file never leaves the device), and the user signs a Stacks transaction that anchors the hash on chain with an optional label. Anyone can later visit `/v/<hash>` to verify the anchor: when it was created, by which wallet, what label was attached, and re-upload a file to confirm its hash matches. The point is a permanent, verifiable proof-of-existence timestamp without exposing the document itself.

## Stack

- Smart contract: Clarity 3, deployed via Clarinet to Stacks mainnet
- Frontend: Next.js 14 App Router, TypeScript (strict), Tailwind, deployed to Vercel
- Wallet: Stacks Connect (Leather, Xverse, Asigna)
- Reads: Hiro Stacks API at `https://api.mainnet.hiro.so`
- No backend, no database, no auth server. Hashing is client-side. Reads go directly to the public Hiro API.

## Identifiers

- Mainnet deployer principal: `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`
- Contract identifier (after deploy): `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock`

## Repo layout

- `/` Clarinet project (Clarinet.toml, contracts/, tests/, settings/, deployments/)
- `/contracts/thesislock.clar` the anchor contract
- `/tests/thesislock.test.ts` Clarinet SDK + Vitest test suite
- `/web` Next.js 14 App Router frontend
- `/.devcontainer` Codespaces config

## Conventions

- Clarity 3 syntax. Use `stacks-block-height` and `burn-block-height`. Never `block-height`.
- TypeScript strict mode. Do not disable.
- Conventional commits: `feat`, `fix`, `chore`, `docs`, `test`. Frequent meaningful commits, not bulk dumps.
- Branch names use a conventional-commit prefix and kebab-case description, for example `feat/live-updates`, `fix/empty-baseline`, `chore/session-setup`.
- No AI tool attribution anywhere: no `Co-Authored-By` trailers, and no AI tool or assistant names in commit messages, branch names, or code comments.
- No em dashes anywhere in user-facing copy or code comments.
- No emojis in UI.
- Reads route through the public Hiro mainnet API. No private RPC.
- Secrets (mnemonics, Vercel tokens) are never logged or committed. `settings/Mainnet.toml`, `.env`, `.env.local` are gitignored.

## Build context

This project is competing in the Stacks Builder Rewards program (April-May 2026). The repo is public. Scoring rewards verified contributions to public GitHub repos and activity on verified deployed contracts.
