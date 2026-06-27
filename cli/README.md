# thesislock-cli

Command-line tool for verifying [ThesisLock](https://thesis-lock.vercel.app/) document anchors on the Stacks blockchain. Hash files, check anchors, search the protocol, and gate CI pipelines from a terminal, with no browser or wallet required.

All reads go through the public Hiro API. The CLI never uploads files anywhere: hashing happens locally and only the SHA-256 digest is compared against on-chain data.

## Installation

### From the npm registry

Once the package is published, install it globally:

```bash
npm install -g thesislock-cli
thesislock --help
```

Or run it without installing, using `npx`:

```bash
npx thesislock-cli verify <hash>
```

### From source

The CLI depends on the sibling `sdk/` package, so build that first:

```bash
cd sdk && npm install && npm run build
cd ../cli && npm install && npm run build
node dist/bin/thesislock.js --help
```

To put the `thesislock` command on your PATH from a source checkout:

```bash
cd cli && npm link
```

## Commands

Every command accepts `--json` for machine-readable output and `--quiet` for a single essential value, which makes the CLI easy to script. The full flag reference is below.

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

| Flag                  | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `--owner <principal>` | Also check owner-keyed batch anchors for this principal |
| `--json`              | Print `{ hash, verified, count, results }` as JSON      |
| `--quiet`             | Print only `true` or `false`                            |

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

| Flag       | Description                                                 |
| ---------- | ----------------------------------------------------------- |
| `--verify` | Check each hash against the chain after computing it        |
| `--json`   | Print an array of `{ file, size, hash, anchored? }` objects |
| `--quiet`  | Print only the hash, one per line                           |

### status

Protocol overview: contract count and addresses, the latest Stacks block, and Hiro API health.

```bash
thesislock status
```

Pass a principal to see how many anchors a wallet has registered:

```bash
thesislock status SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX
```

| Flag      | Description                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------- |
| `--json`  | Print `{ apiUrl, healthy, latestBlock, contracts }`, or `{ principal, anchors }` with a principal |
| `--quiet` | Print only `ok`/`unreachable`, or the anchor count with a principal                               |

### search

Search anchors across all contracts. The query type is auto-detected the same way as the web search: a 64-character hex string searches by hash, a Stacks address searches by wallet, and anything else is a label substring match.

```bash
thesislock search "thesis draft"
thesislock search SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX
thesislock search 9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06
```

Results print as a table with source, hash, label, owner, and block. Add `--json` for machine-readable output, and `--limit` to cap the number of rows:

```bash
thesislock search "thesis draft" --json
thesislock search SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX --limit 5
```

| Flag          | Description                                               |
| ------------- | --------------------------------------------------------- |
| `--json`      | Print an array of result objects, each with a `verifyUrl` |
| `--quiet`     | Print only the matching hashes, one per line              |
| `--limit <n>` | Show at most `n` results                                  |

### batch

Hash every file in a directory. Useful for fingerprinting a whole folder of documents at once, or checking which files in a release are already anchored.

```bash
thesislock batch ./papers
thesislock batch ./papers --recursive --exclude "*.log,node_modules"
thesislock batch ./papers --verify
```

For each file the CLI prints the path (relative to the scanned directory), size, and hash, then a summary line. Add `--verify` to check each hash on chain.

| Flag                   | Description                                                       |
| ---------------------- | ----------------------------------------------------------------- |
| `--verify`             | Check each hash against the chain                                 |
| `--recursive`          | Descend into subdirectories                                       |
| `--exclude <patterns>` | Comma-separated glob patterns (`*` and `?`) to skip by name       |
| `--json`               | Print an array of `{ file, path, size, hash, anchored? }` objects |
| `--quiet`              | Print only the hashes, one per line                               |

## Scripting

`--quiet` makes each command emit a single value, ideal for shell substitution:

```bash
# Capture a file's hash into a variable
HASH=$(thesislock hash thesis.pdf --quiet)

# Branch on whether a hash is anchored
if [ "$(thesislock verify "$HASH" --quiet)" = "true" ]; then
  echo "anchored"
fi

# Count a wallet's anchors
COUNT=$(thesislock status SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX --quiet)
```

`--json` pairs well with `jq` for richer queries:

```bash
# List the path of every unanchored file in a directory
thesislock batch ./papers --verify --json \
  | jq -r '.[] | select(.anchored == false) | .path'

# Get the owner of the first search hit
thesislock search "thesis draft" --json | jq -r '.[0].owner'
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

## Shell completion

Completion scripts for `bash` and `zsh` ship in the `completions/` directory and complete every command and flag.

Bash:

```bash
# from your ~/.bashrc
source /path/to/thesislock-cli/completions/thesislock.bash
# or system-wide
sudo cp completions/thesislock.bash /usr/share/bash-completion/completions/thesislock
```

Zsh:

```bash
mkdir -p ~/.zsh/completions
cp completions/thesislock.zsh ~/.zsh/completions/_thesislock
# then in ~/.zshrc, before compinit:
#   fpath=(~/.zsh/completions $fpath)
#   autoload -U compinit && compinit
```

## Configuration

| Environment variable | Default                       | Purpose                                            |
| -------------------- | ----------------------------- | -------------------------------------------------- |
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
