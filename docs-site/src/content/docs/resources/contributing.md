---
title: Contributing
description: How to contribute to ThesisLock and to this documentation.
sidebar:
  order: 4
---

ThesisLock is open source. Contributions of all kinds are welcome, from bug reports and
documentation to frontend features and smart contract improvements.

## The project

The product lives at [github.com/Tim-cryptow/thesis-lock](https://github.com/Tim-cryptow/thesis-lock).
Start with the repository's `CONTRIBUTING.md` for the full workflow. In short:

- Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `docs`,
  `chore`, `test`).
- Branch names use a conventional-commit prefix and kebab-case, for example
  `feat/batch-export`.
- TypeScript is strict; do not disable strict checks.
- Contracts are Clarity 3; use `stacks-block-height` and `burn-block-height`.
- Run the relevant checks before opening a pull request (contract tests with `npm test`,
  and for the web app `npm run build`, `npm run lint`, and `npm run format:check`).

## This documentation

These docs are an [Astro Starlight](https://starlight.astro.build/) site. Pages are Markdown
and MDX under `docs-site/src/content/docs`. To work on them locally:

```bash
cd docs-site
npm install
npm run dev      # local preview with hot reload
npm run build    # production build, also used in CI
```

When you edit a page, keep these conventions:

- Verify any fact against the source (contracts, SDK, CLI, API) before documenting it.
- Keep code samples runnable.
- No em dashes and no emojis in content.
- Cross-link related pages rather than repeating content.

## Reporting issues

Open an issue on [GitHub](https://github.com/Tim-cryptow/thesis-lock/issues). For security
reports, follow the repository's `SECURITY.md` and use private vulnerability reporting
rather than a public issue.
