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
3. Make sure the contract tests pass (`npm test`), `clarinet check` is clean, and the frontend builds, lints, and is formatted (`cd web && npm run build && npm run lint && npm run format:check`).
4. Open a pull request against `main` and fill in the pull request template.

CI runs `clarinet check`, the contract tests, the frontend build, a TypeScript type check, and lint and format checks for each package on every pull request, so it helps to run these locally first.

## Security

Run a dependency audit in any package you change and resolve high or critical advisories before opening a pull request. CI enforces the same gate.

```bash
cd web   # or the repo root, sdk, or cli
npm audit --audit-level=high
npm run audit:sri   # web only
```

Avoid adding dependencies that carry known high or critical advisories. To report a security vulnerability, follow [SECURITY.md](SECURITY.md) and use GitHub's private vulnerability reporting rather than a public issue.

## Code style

See [CODESTYLE.md](CODESTYLE.md) for the full conventions and the ESLint,
Prettier, and TypeScript setup. In short:

- TypeScript in strict mode. Do not disable strict checks.
- Tailwind for styling. No external CSS frameworks.
- Clarity 3 syntax for contracts. Use `stacks-block-height` and `burn-block-height`.

Run the linter and formatter in any package you change before opening a pull
request. A pre-commit hook also runs lint-staged on your staged files.

```bash
cd web   # or sdk, or cli
npm run lint
npm run format:check
```

## Smart contracts

- Every contract change must pass `clarinet check`.
- New public or read-only functions need accompanying tests in `tests/`.
- Call out any change to on-chain data shapes or function signatures, since deployed contracts cannot be edited in place.

## Help content

The in-app help center (the FAQ, guides, and troubleshooting entries) is plain data in `web/lib/help.ts`. To add or edit an answer, a guide, or a troubleshooting entry, update that file. Each entry has a stable slug used for deep links and the command palette, so keep existing slugs unchanged when editing.

## Questions

If something is unclear or you want to discuss an idea before building it, open an issue or start a discussion on the repository. We are happy to help.
