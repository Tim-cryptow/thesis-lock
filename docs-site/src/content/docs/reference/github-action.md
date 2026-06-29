---
title: GitHub Action
description: Verify a document hash is anchored on chain as a step in a GitHub Actions workflow.
sidebar:
  order: 6
---

The ThesisLock Verify action checks that a document hash is anchored on Stacks, directly in
CI. It reads the public Hiro mainnet API and needs no wallet, secret, or signing key.

- **Action:** `Tim-cryptow/thesis-lock/action@main`
- **Runtime:** Node 20

## Usage

Hash a file in your repo and verify it:

```yaml
- name: Verify dataset hash
  uses: Tim-cryptow/thesis-lock/action@main
  with:
    file: ./data/dataset.csv
    fail-on-unverified: "true"
```

Verify a hash you already know:

```yaml
- uses: Tim-cryptow/thesis-lock/action@main
  with:
    hash: "9afe6f57ea2af60478ad37b2d44ae8ede492c4f3b7e70bcc7dfea92128585d06"
```

Verify a batch anchor by passing the anchoring wallet:

```yaml
- uses: Tim-cryptow/thesis-lock/action@main
  with:
    file: ./data/dataset.csv
    owner: "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM"
```

Read the outputs in a later step:

```yaml
- id: verify
  uses: Tim-cryptow/thesis-lock/action@main
  with:
    file: ./data/dataset.csv
    fail-on-unverified: "false"
- run: |
    echo "verified: ${{ steps.verify.outputs.verified }}"
    echo "source:   ${{ steps.verify.outputs.source }}"
    echo "block:    ${{ steps.verify.outputs.block }}"
    echo "label:    ${{ steps.verify.outputs.label }}"
```

## Inputs

| Input                | Description                                | Required | Default |
| -------------------- | ------------------------------------------ | -------- | ------- |
| `hash`               | SHA-256 hash to verify (64 hex chars).     | No       |         |
| `file`               | Path to a file to hash and verify.         | No       |         |
| `owner`              | Stacks principal for a batch anchor lookup.| No       |         |
| `fail-on-unverified` | Fail the step if the hash is not verified. | No       | `true`  |

Provide either `hash` or `file`. When `file` is set it takes precedence, and the action
computes the file's SHA-256 digest locally.

## Outputs

| Output     | Description                                            |
| ---------- | ----------------------------------------------------- |
| `verified` | Whether the hash is verified on chain (`true`/`false`).|
| `source`   | Anchor source (`single`, `batch`, `proof`, `group`).  |
| `block`    | Stacks block number where the hash was anchored.      |
| `label`    | Label attached to the anchor.                         |

## How it works

1. If `file` is supplied, the action reads it and computes a SHA-256 digest. The file never
   leaves the runner.
2. It queries the public Hiro mainnet API with read-only calls:
   - `thesislock.get-anchor` for single anchors,
   - `thesislock-batch.get-batch-anchor` when an `owner` is supplied,
   - `thesislock-proof.get-token-id-by-hash` then `get-proof` for proof NFTs.
3. The first contract that holds the hash sets `source`, `block`, and `label`. If none do,
   the hash is not verified.
4. When `fail-on-unverified` is `true` (the default), an unverified hash fails the step, so
   a broken proof can gate a release.
