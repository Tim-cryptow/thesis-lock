# Contributing to ThesisLock

Thanks for your interest in contributing. ThesisLock is an open-source document timestamping tool on the Stacks blockchain: a file is hashed in the browser with SHA-256, the hash is anchored on chain with an optional label, and anyone can later verify when it was anchored and by which wallet without the file ever leaving the owner's device. Contributions of all kinds are welcome, from bug reports and documentation to frontend features and smart contract improvements.

## Prerequisites

- Node.js 20 or newer
- [Clarinet](https://github.com/hirosystems/clarinet) for the Clarity contracts
- A Stacks wallet such as [Leather](https://leather.io/) or [Xverse](https://www.xverse.app/) for testing wallet flows

## Getting started

Clone the repository:

```bash
git clone https://github.com/Tim-cryptow/thesis-lock.git
cd thesis-lock
```

### Contracts

The Clarity project lives at the repository root.

```bash
npm install
clarinet check
npm test
```

### Frontend

The Next.js app lives in `web/`.

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

## Branch naming

Use a short prefix that describes the kind of work:

- `feat/` for new features
- `fix/` for bug fixes
- `docs/` for documentation
- `ci/` for CI and tooling
- `chore/` for maintenance

For example: `feat/batch-export` or `fix/verify-owner-lookup`.

## Commit messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/). Start each message with a type, then a concise summary of the change:

- `feat:` a new feature
- `fix:` a bug fix
- `docs:` documentation only
- `ci:` CI or tooling
- `chore:` maintenance
- `test:` adding or updating tests

Prefer frequent, focused commits over large bulk changes.

## Pull request process

1. Fork the repository and create a branch from `main`.
2. Make your changes, keeping commits focused.
3. Make sure the contract tests pass (`npm test`), `clarinet check` is clean, and the frontend builds (`cd web && npm run build`).
4. Open a pull request against `main` and fill in the pull request template.

CI runs `clarinet check`, the contract tests, the frontend build, and a TypeScript type check on every pull request, so it helps to run these locally first.

## Code style

See [CODESTYLE.md](CODESTYLE.md) for the full conventions and the ESLint,
Prettier, and TypeScript setup. In short:

- TypeScript in strict mode. Do not disable strict checks.
- Tailwind for styling. No external CSS frameworks.
- Clarity 3 syntax for contracts. Use `stacks-block-height` and `burn-block-height`.

## Smart contracts

- Every contract change must pass `clarinet check`.
- New public or read-only functions need accompanying tests in `tests/`.
- Call out any change to on-chain data shapes or function signatures, since deployed contracts cannot be edited in place.

## Questions

If something is unclear or you want to discuss an idea before building it, open an issue or start a discussion on the repository. We are happy to help.
