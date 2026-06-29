---
title: Using the web app
description: A tour of the ThesisLock web app and the pages you will use most.
sidebar:
  order: 1
  label: Using the web app
---

The [ThesisLock web app](https://thesis-lock.vercel.app) is where you anchor documents and
where most people verify them. You only need a wallet to anchor; reading and verifying are
public and need no account.

## The main pages

| Page          | Path           | What it does                                              |
| ------------- | -------------- | -------------------------------------------------------- |
| Anchor        | `/anchor`      | Hash a file and anchor it, single or batch.              |
| Verify        | `/v/<hash>`    | Check an anchor and confirm a file matches.              |
| My Anchors    | `/anchors`     | Your anchor history, from the registry.                  |
| Search        | `/search`      | Find anchors by hash, wallet, or label.                  |
| Feed          | `/feed`        | A live stream of protocol activity.                      |
| Stats         | `/stats`       | Protocol totals and daily series.                        |
| Groups        | `/groups`      | Create and manage collaborative groups.                  |
| Dashboard     | `/dashboard`   | Your personalized overview.                              |
| Activity      | `/activity`    | A unified per-wallet timeline.                           |
| Compare       | `/compare`     | Compare two anchors side by side.                        |
| Report        | `/report`      | Build a multi-document verification report.             |
| Templates     | `/templates`   | Structured label templates.                             |
| Developers    | `/developers`  | API playground, keys, and webhooks.                     |

## Getting around

- **Command palette:** press `Ctrl+K` (or `Cmd+K` on macOS) to jump to any page or run an
  action like starting a new anchor or toggling the theme. Press `?` for the full list of
  keyboard shortcuts.
- **Themes and language:** the app supports light and dark themes and several interface
  languages, set from the settings page.
- **Live updates:** the feed, stats, and explorer update in near real time from a single
  background poller, with a ticker at the top of the page.

## What needs a wallet

Anchoring, batch anchoring, minting proof NFTs, and group actions are transactions, so they
need a connected wallet and a small fee. Everything else, including verifying, searching,
browsing the feed, and reading profiles, is public and read-only.

## Where to go next

- [Anchor documents](/guides/anchoring-documents/): single, batch, templates, and proof
  NFTs.
- [Collaborative groups](/guides/collaborative-groups/): anchor together.
- [Verify documents](/guides/verifying-documents/): verification, comparison, and reports.
- [Organize your anchors](/guides/organizing-your-anchors/): collections, tags, and more.
