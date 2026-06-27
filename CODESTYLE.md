# Code style

The coding conventions for ThesisLock and the tooling that enforces them across
the web app (`web/`), the SDK (`sdk/`), and the CLI (`cli/`). For setup and the
pull request process, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Tooling

- **TypeScript** runs in strict mode, plus `noUncheckedIndexedAccess`,
  `noImplicitReturns`, and `noFallthroughCasesInSwitch`. Do not relax these.
- **Prettier** owns formatting. Run `npm run format` inside a package to apply
  it, or `npm run format:check` to verify.
- **ESLint** runs the TypeScript and React Hooks rules. Run `npm run lint`
  inside a package.
- A **husky** pre-commit hook runs **lint-staged**, which lints and formats only
  the files you stage, so commits stay clean. Each package is linted and
  formatted with its own configuration.

## Formatting

Prettier is the single source of truth for formatting; do not hand-format. The
shared settings (`.prettierrc` in each package) are:

| Option          | Value  |
| --------------- | ------ |
| semicolons      | yes    |
| quotes          | double |
| trailing commas | all    |
| print width     | 100    |
| tab width       | 2      |

## ESLint rules

The web app uses the TypeScript and React Hooks plugins; the SDK and CLI use the
TypeScript plugin only. The notable rules:

- `@typescript-eslint/no-unused-vars` (warn). Prefix an intentionally unused
  binding with `_` to silence it.
- `@typescript-eslint/no-explicit-any` (warn). Prefer `unknown` and narrow.
- `react-hooks/rules-of-hooks` (error) and `react-hooks/exhaustive-deps` (warn).
- `no-console` (warn, allowing `console.warn` and `console.error`) in the web app
  and SDK; off in the CLI, where the terminal is the command's output channel.

## Conventions

### Import order

Group imports from most external to most local, with a blank line between groups
where it aids readability:

1. React and Next
2. Third-party libraries
3. Internal libraries (`@/lib/...`)
4. Components (`@/app/components/...`)
5. Types

### File naming

- Modules and utilities use camelCase: `fetchWithRetry.ts`, `activityLog.ts`.
- React component files use PascalCase matching their default export:
  `FilePreview.tsx`, `AnchorClient.tsx`.

### Component structure

Within a React component, order top to bottom: types, hooks (state, refs,
effects), event handlers, then the returned JSX.

### TypeScript

- Handle the `T | undefined` that indexed access now returns rather than
  disabling `noUncheckedIndexedAccess`.
- Avoid `any`; reach for `unknown` and narrow with type guards.

### Contracts

- Clarity 3 syntax. Use `stacks-block-height` and `burn-block-height`, never
  `block-height`.

### Text

- No em dashes in user-facing copy or code comments.
- No emojis in the UI.
