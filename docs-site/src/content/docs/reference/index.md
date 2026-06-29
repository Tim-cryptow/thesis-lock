---
title: Reference overview
description: The complete reference for ThesisLock contracts, SDK, CLI, REST API, Action, feeds, and webhooks.
sidebar:
  order: 1
  label: Overview
---

This section is the exact, authoritative reference for every ThesisLock surface. Everything
here is read-only to use except anchoring itself, which requires a wallet.

## What is covered

- [Smart contracts](/reference/smart-contracts/): all five Clarity contracts, with
  signatures, return types, error codes, and events.
- [SDK](/reference/sdk/): the `thesislock-sdk` package for JavaScript and TypeScript.
- [CLI](/reference/cli/): the `thesislock-cli` tool for the terminal and CI.
- [REST API](/reference/rest-api/): public HTTP endpoints for verification, search,
  badges, and more.
- [GitHub Action](/reference/github-action/): verify an anchor in a workflow.
- [Feeds](/reference/feeds/): RSS, Atom, and JSON feeds of protocol events.
- [Webhooks](/reference/webhooks/): event payloads and signature verification.

## Canonical identifiers

| Item                 | Value                                              |
| -------------------- | -------------------------------------------------- |
| Deployer principal   | `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`        |
| Contract id format   | `SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.<name>` |
| Contracts            | `thesislock`, `thesislock-batch`, `thesislock-registry`, `thesislock-proof`, `thesislock-groups` |
| Read API (Hiro)      | `https://api.mainnet.hiro.so`                      |
| Web app and REST API | `https://thesis-lock.vercel.app`                   |

## How reads work

All reads go through the public Hiro Stacks API and need no key or account. The
[SDK](/reference/sdk/), [CLI](/reference/cli/), and [Action](/reference/github-action/) call
read-only contract functions directly and decode the Clarity result for you. The
[REST API](/reference/rest-api/) wraps the same data in plain JSON. See
[On-chain truth and the index](/concepts/on-chain-truth-and-the-index/) for how the chain
and the optional index relate.
