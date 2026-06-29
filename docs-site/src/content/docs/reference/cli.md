---
title: CLI
description: The thesislock-cli tool for hashing, verifying, searching, and gating CI from the terminal.
sidebar:
  order: 4
---

`thesislock-cli` verifies ThesisLock anchors from the terminal. It hashes files locally,
checks anchors, searches the protocol, and gates CI pipelines, with no browser or wallet.
All reads go through the public Hiro API, and files are never uploaded.

## Installation

```bash
npm install -g thesislock-cli
thesislock --help
```

Or run it without installing:

```bash
npx thesislock-cli verify <hash>
```

## Global flags

Every command accepts:

- `--json`: machine-readable output.
- `--quiet`: a single essential value, ideal for scripting.

## Commands

### `verify <hash> [--owner <principal>]`

Check whether a hash is anchored in any ThesisLock contract.

```bash
thesislock verify 9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06
```

Exits `0` when anchored and `1` when not, so it works directly as a CI gate. Batch anchors
are keyed by `{ hash, owner }`; known owners are discovered automatically, and you can also
pass one explicitly.

| Flag                  | Description                                              |
| --------------------- | ------------------------------------------------------- |
| `--owner <principal>` | Also check owner-keyed batch anchors for this principal.|
| `--json`              | Print `{ hash, verified, count, results }`.             |
| `--quiet`             | Print only `true` or `false`.                           |

### `hash <files...> [--verify]`

Compute the SHA-256 digest of one or more files.

```bash
thesislock hash thesis.pdf
thesislock hash chapter1.pdf chapter2.pdf --verify
```

With `--verify`, the exit code is `1` if any file is missing an anchor.

| Flag       | Description                                                  |
| ---------- | ----------------------------------------------------------- |
| `--verify` | Check each digest against the chain after computing it.     |
| `--json`   | Print an array of `{ file, size, hash, anchored? }` objects.|
| `--quiet`  | Print only the hash, one per line.                          |

### `status [principal]`

Protocol overview: contract count and addresses, the latest Stacks block, and Hiro API
health. Pass a principal to see how many anchors a wallet has registered.

```bash
thesislock status
thesislock status SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX
```

| Flag      | Description                                                                       |
| --------- | -------------------------------------------------------------------------------- |
| `--json`  | `{ apiUrl, healthy, latestBlock, contracts }`, or `{ principal, anchors }`.       |
| `--quiet` | `ok`/`unreachable`, or the anchor count with a principal.                         |

### `search <query> [--limit <n>]`

Search anchors across all contracts. The query type is auto-detected: 64 hex characters is a
hash, a Stacks address is a wallet, anything else is a label substring.

```bash
thesislock search "thesis draft"
thesislock search SPMXTB2P571VMJP2ZG812P2H964S1XVTCDC8QNYX --limit 5
```

| Flag          | Description                                               |
| ------------- | -------------------------------------------------------- |
| `--json`      | Print an array of result objects, each with a `verifyUrl`.|
| `--quiet`     | Print only the matching hashes, one per line.            |
| `--limit <n>` | Show at most `n` results.                                |

### `batch <dir> [--recursive] [--exclude <globs>] [--verify]`

Hash every file in a directory, optionally checking each one on chain.

```bash
thesislock batch ./papers --recursive --exclude "*.log,node_modules" --verify
```

| Flag                   | Description                                                       |
| ---------------------- | ---------------------------------------------------------------- |
| `--verify`             | Check each hash against the chain.                               |
| `--recursive`          | Descend into subdirectories.                                     |
| `--exclude <patterns>` | Comma-separated glob patterns (`*` and `?`) to skip by name.     |
| `--json`               | Print an array of `{ file, path, size, hash, anchored? }` objects.|
| `--quiet`              | Print only the hashes, one per line.                            |

## Scripting

`--quiet` makes each command emit a single value:

```bash
HASH=$(thesislock hash thesis.pdf --quiet)
if [ "$(thesislock verify "$HASH" --quiet)" = "true" ]; then echo "anchored"; fi
```

`--json` pairs well with `jq`:

```bash
thesislock batch ./papers --verify --json | jq -r '.[] | select(.anchored == false) | .path'
```

## CI integration

```yaml
jobs:
  verify-anchor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g thesislock-cli
      - run: thesislock hash docs/whitepaper.pdf --verify
```

The job fails automatically when the file's hash has no anchor. The
[GitHub Action](/reference/github-action/) is a more concise alternative.

## Shell completion

Completion scripts for `bash` and `zsh` ship in the `completions/` directory and complete
every command and flag.

```bash
# bash, in ~/.bashrc
source /path/to/thesislock-cli/completions/thesislock.bash
```

## Configuration

| Environment variable | Default                       | Purpose                                  |
| -------------------- | ----------------------------- | ---------------------------------------- |
| `THESISLOCK_API_URL` | `https://api.mainnet.hiro.so` | Base URL of the Hiro API used for reads. |

```bash
THESISLOCK_API_URL=https://my-hiro-proxy.example.com thesislock status
```
