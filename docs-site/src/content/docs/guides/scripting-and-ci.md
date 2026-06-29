---
title: Scripting and CI
description: Automate verification with the CLI, the SDK, the GitHub Action, and the REST API.
sidebar:
  order: 7
---

Verification is read-only and public, which makes it easy to automate. Use whichever tool
fits your environment. Each links to its full reference.

## In a shell script (CLI)

The [CLI](/reference/cli/) exits `0` when a hash is anchored and `1` when it is not, so it
works directly as a gate:

```bash
# Hash a file and verify it in one step
npx thesislock-cli hash thesis.pdf --verify

# Branch on a known hash
if [ "$(npx thesislock-cli verify "$HASH" --quiet)" = "true" ]; then
  echo "anchored"
fi
```

Add `--json` for machine-readable output that pairs well with `jq`.

## In JavaScript or TypeScript (SDK)

The [SDK](/reference/sdk/) is the right choice for programmatic use:

```ts
import { createClient } from "thesislock-sdk";

const client = createClient();
const result = await client.verify(hash);
if (!result.verified) process.exit(1);
```

## In GitHub Actions

The [GitHub Action](/reference/github-action/) verifies a file or hash as a pipeline step:

```yaml
- name: Verify the published whitepaper is anchored
  uses: Tim-cryptow/thesis-lock/action@main
  with:
    file: ./docs/whitepaper.pdf
    fail-on-unverified: "true"
```

By default the step fails when the file's hash has no anchor, so a broken proof can gate a
release.

## In any CI (REST API)

With nothing installed, call the public [REST API](/reference/rest-api/):

```bash
curl -fsS "https://thesis-lock.vercel.app/api/verify/$HASH" | jq -e '.verified'
```

`jq -e` exits non-zero when `.verified` is false, turning the check into a gate.

## Pointing at a different node

The CLI and SDK read the Hiro mainnet API by default. To use a different endpoint (for
example, a proxy), set `THESISLOCK_API_URL` for the CLI, or pass `apiUrl` to the SDK
client.
