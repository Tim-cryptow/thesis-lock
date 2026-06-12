# thesislock-cli

Command-line tool for verifying [ThesisLock](https://thesis-lock.vercel.app/) document anchors on the Stacks blockchain. Hash files, check anchors, and search the protocol from a terminal or a CI pipeline, with no browser or wallet required.

All reads go through the public Hiro API. The CLI never uploads files anywhere: hashing happens locally and only the SHA-256 digest is compared against on-chain data.

## Installation

```bash
npm install -g thesislock-cli
```

Or run it from the monorepo:

```bash
cd cli
npm install
npm run build
node dist/bin/thesislock.js --help
```

## Commands

### verify

Check whether a SHA-256 hash is anchored in any ThesisLock contract (single, batch, registry, proof NFT, or group).

```bash
thesislock verify 9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06
```

```
Verified
  Source:    thesislock (single anchor)
  Label:     project
  Owner:     SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX
  Block:     8104143
  Timestamp: 2026-05-27T13:13:00.000Z
```

Batch anchors are keyed by `{ hash, owner }` on chain. Known owners are discovered automatically from registry events, and an explicit owner can be supplied too:

```bash
thesislock verify <hash> --owner SP000...
```

Exits with code `0` when the hash is anchored and `1` when it is not, so the command works directly as a CI gate.

### hash

Compute the SHA-256 digest of one or more files.

```bash
thesislock hash thesis.pdf
thesislock hash chapter1.pdf chapter2.pdf chapter3.pdf
```

For each file the CLI prints the filename, size, and 64-character hex hash. Add `--verify` to check each digest against the chain in the same step:

```bash
thesislock hash thesis.pdf --verify
```

With `--verify`, the exit code is `1` if any file is missing an anchor.

### status

Protocol overview: contract count and addresses, the latest Stacks block, and Hiro API health.

```bash
thesislock status
```

Pass a principal to see how many anchors a wallet has registered:

```bash
thesislock status SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX
```

### search

Search anchors across all contracts. The query type is auto-detected the same way as the web search: a 64-character hex string searches by hash, a Stacks address searches by wallet, and anything else is a label substring match.

```bash
thesislock search "thesis draft"
thesislock search SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX
thesislock search 9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06
```

Results print as a table with source, hash, label, owner, and block. Add `--json` for machine-readable output:

```bash
thesislock search "thesis draft" --json
```

## CI integration

Use `verify` (or `hash --verify`) as a pipeline step that fails when a document is not anchored. GitHub Actions example:

```yaml
jobs:
  verify-anchor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install ThesisLock CLI
        run: npm install -g thesislock-cli

      - name: Verify the published whitepaper is anchored
        run: thesislock hash docs/whitepaper.pdf --verify
```

The job fails automatically when the file's hash has no anchor on chain.

## Configuration

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `THESISLOCK_API_URL` | `https://api.mainnet.hiro.so` | Base URL of the Hiro Stacks API used for all reads |

Example with a custom endpoint:

```bash
THESISLOCK_API_URL=https://my-hiro-proxy.example.com thesislock status
```

## Related packages

- [`thesislock-sdk`](../sdk/README.md) powers the contract reads and is the right choice for programmatic use in JavaScript or TypeScript.
- The [web app](https://thesis-lock.vercel.app/) anchors new documents; the CLI is read-only and verifies existing anchors.

## License

MIT
