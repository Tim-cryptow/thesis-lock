---
title: Collaborative groups
description: Create a named group, manage members, and anchor to a shared timeline.
sidebar:
  order: 3
---

Groups let several people contribute to one shared, ordered history of anchors. They are a
good fit for a thesis committee collecting drafts, a legal team organizing filings, or a
research lab timestamping datasets.

## Create a group

On the [groups page](https://thesis-lock.vercel.app/groups), create a group with a name (up
to 64 ASCII characters). This calls `create-group`, which makes you the group's **admin**
and adds you as its first **member**. Each group gets a numeric id, and its page lives at
`/groups/<id>`.

## Manage members

As the admin, you can:

- **Add a member** with `add-member`. Only the admin can add members.
- **Remove a member** with `remove-member`. Only the admin can remove members, and the
  admin cannot remove themselves.

Membership controls who can anchor to the group, not who can read it; group history is
public like everything else on chain.

## Anchor to the group

Any member can anchor a hash to the group with `anchor-to-group`. Each anchor is appended
to the group's ordered history under an incrementing index and records the hash, the label,
the member who anchored it, and the Stacks block. You can read a group's anchor count and
its most recent anchors (newest first).

## Roles at a glance

| Action            | Who can do it      | Contract function   |
| ----------------- | ------------------ | ------------------- |
| Create a group    | anyone             | `create-group`      |
| Add a member      | admin only         | `add-member`        |
| Remove a member   | admin only         | `remove-member`     |
| Anchor to a group | any member         | `anchor-to-group`   |
| Read group data   | anyone (public)    | read-only functions |

For exact signatures and error codes (for example, the admin-only and member-only checks),
see the [smart contract reference](/reference/smart-contracts/#thesislock-groups).
