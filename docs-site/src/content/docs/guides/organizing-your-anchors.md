---
title: Organizing your anchors
description: Collections, tags, favorites, the watchlist, the calendar, and your activity log.
sidebar:
  order: 5
---

ThesisLock includes several tools for keeping track of anchors. They all run in your
browser and store data in `localStorage`, so they are private to you, do not sync across
devices, and can be backed up and restored from the settings page.

## My Anchors

Your anchor history at `/anchors` is built from the on-chain registry, so it reflects what
you have anchored from the connected wallet. Unlike the features below, this is read from
the chain, not local storage.

## Collections

Collections are browser-local folders for grouping anchors by topic, separate from on-chain
[groups](/guides/collaborative-groups/). Create one with a name, description, color, and
icon, then add anchors by hash, by dropping a file (hashed locally), or with the collect
button on verify, anchors, search, and feed views. Collections support bulk actions (verify
all, generate a report, export CSV) and can be shared by URL or exported as JSON.

## Tags

Tags are lightweight labels you attach to anchors, up to ten per anchor. You can filter by
tag across history, the feed, and search. The app suggests tags from an anchor's label, for
example template prefixes like `academic` or workflow words like `draft`. The tags page
shows a tag cloud and management tools (rename, merge, delete). Tags are stored locally and
are not published on chain.

## Favorites

Star a hash, a wallet, a group, or a page to pin it for quick access. The star control
appears throughout the app (on verify pages, profiles, group names, and result rows). Your
favorites are reachable from the favorites bar at the top of the page and the favorites
page.

## Watchlist

The watchlist monitors items for changes: hashes for verification status, wallets for new
anchors, and groups for member activity. Add items from a form or with the watch button on
verify, profile, group, search, and feed views. The app checks watched items when you open
it (at most once every few minutes) and flags anything new since your last check.

## Calendar and activity

- The **calendar** visualizes your anchoring activity as a contribution graph and a monthly
  view, with current and longest streaks. Each anchored document counts as one, and dates
  are in UTC.
- The **activity log** at `/activity` is a unified, chronological timeline of all your
  contract interactions (single and batch anchors, registry entries, proof mints, and group
  actions). It is also available per wallet at `/u/<principal>/activity` and through the
  [activity API](/reference/rest-api/#get-apiactivity).

## Backing up

Everything stored locally (collections, tags, favorites, watchlist, the audit log,
notifications, and preferences) can be exported to a single JSON file and restored later
from the settings page. Clearing site data removes it, so export if you want a durable copy.
