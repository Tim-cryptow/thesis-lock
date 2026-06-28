# Security Policy

ThesisLock anchors SHA-256 document hashes on the Stacks blockchain as a proof
of existence. The chain is the source of truth, and documents are hashed in the
browser and never uploaded. This document explains how to report a vulnerability
and what is in scope.

## Reporting a vulnerability

Please report security issues privately. Do not open a public issue for a
sensitive vulnerability.

1. Go to the repository's Security tab on GitHub.
2. Under Advisories, choose "Report a vulnerability" to open a private report
   visible only to the maintainers.
3. Include the affected component, a description of the issue, steps to
   reproduce, and the impact you expect.

If private reporting is unavailable to you, open a minimal public issue that
states only that you have found a security problem and asks for a private
contact, without disclosing details.

What to expect:

- Acknowledgement of your report, typically within a few days.
- An assessment of severity and affected components.
- A fix or mitigation plan, and coordinated disclosure once a fix is available.

Please give us a reasonable window to address the issue before any public
disclosure. We appreciate responsible reporting.

## Scope

In scope:

- The Clarity smart contracts deployed to Stacks mainnet under
  `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM` (thesislock, thesislock-batch,
  thesislock-registry, thesislock-proof, thesislock-groups).
- The web application in `web/` (Next.js).
- The SDK in `sdk/` and the CLI in `cli/`.
- The GitHub Action in `action/`.
- The REST API routes served by the web application under `web/app/api/`.

Out of scope:

- Vulnerabilities in third-party wallets, the Hiro API, Stacks core, Vercel, or
  other upstream infrastructure. Report those to their respective maintainers.
- Findings that require a compromised end-user device or browser extension.
- Social engineering and spam.

## Supported versions

ThesisLock ships from the `main` branch. Fixes land on `main` and, for the SDK
and CLI, in the latest published npm release. Deployed Clarity contracts are
immutable; a contract-level fix would be published as a new contract.

| Component         | Supported          |
| ----------------- | ------------------ |
| Web app (`main`)  | Yes                |
| SDK (latest npm)  | Yes                |
| CLI (latest npm)  | Yes                |
| Mainnet contracts | Current deployment |
| Older revisions   | Not supported      |

## Security properties

- Documents are hashed with SHA-256 entirely client-side. The file content never
  leaves the device; only the hash and an optional label are anchored on chain.
- Chain reads route through the public Hiro mainnet API. There is no private RPC
  and no custodial backend.
- Responses carry a strict Content-Security-Policy and hardening headers (HSTS,
  nosniff, frame protection, a restrictive Permissions-Policy, and a
  cross-origin opener policy). See `web/proxy.ts` and `web/lib/csp.ts`.
- User-supplied input is sanitized before it reaches a contract call, the Hiro
  API, a CSV export, or the DOM. See `web/lib/sanitize.ts`.
- Dependencies are audited in CI. The build fails on any high or critical
  advisory.

## Dependency advisories

`npm audit` is run across all packages and gated in CI at the high severity
level. A small number of low-severity, transitive advisories remain accepted
because the only available fix is a breaking downgrade of a wallet dependency:

- `elliptic`, `secp256k1`, and `bitcoinjs-message` are pulled in transitively by
  `@stacks/connect`. The only npm-offered remediation downgrades
  `@stacks/connect` to a release that breaks wallet support, so these
  low-severity advisories are tracked rather than force-fixed.
- `esbuild` appears as a development-only transitive dependency of the SDK test
  tooling. It does not ship in any published artifact.

The `ws` and `next` high-severity advisories are remediated: `ws` is pinned to a
patched release through an `overrides` entry, and `next` is kept current within
its release line. These accepted items are revisited whenever the upstream
wallet dependencies publish a non-breaking fix.
