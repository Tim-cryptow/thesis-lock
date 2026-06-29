---
title: Smart contracts
description: The five ThesisLock Clarity contracts with exact signatures, return types, error codes, and events.
sidebar:
  order: 2
---

ThesisLock is five Clarity 3 contracts deployed to Stacks mainnet by
`SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM`. The contract id of each is the deployer
principal, a dot, and the contract name, for example
`SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM.thesislock`.

## Calling read-only functions

Read-only functions are free to call and need no wallet. Call them through the Hiro API:

```bash
curl -s -X POST \
  https://api.mainnet.hiro.so/v2/contracts/call-read/SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM/thesislock/is-anchored \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "SP3QS6X01XKTYC84BHA0J567CZTAH67BJHN88FNVM",
    "arguments": ["0x0200000020ec4916dd28fc4c10d78e287 ... 64 hex chars ..."]
  }'
```

The response is `{"okay": true, "result": "0x..."}`, where `result` is a serialized Clarity
value you decode (for example with `@stacks/transactions`' `deserializeCV` and `cvToJSON`).

Arguments are hex-serialized Clarity values:

- A `(buff 32)` hash is the prefix `0x0200000020` followed by the 64-character hex digest.
- A `principal` is serialized with `principalCV(...)` from `@stacks/transactions`.

The [SDK](/reference/sdk/) and [CLI](/reference/cli/) handle all of this for you, so use
them unless you specifically need raw calls.

## Public versus read-only

Public functions change state and must be called in a signed transaction (the web app does
this). Read-only functions only read and can be called for free through the API. Errors are
Clarity `(err uN)` responses; the tables below list each contract's error constants.

---

## thesislock

Single-document anchors. One record per hash, keyed by the hash alone, so a hash can be
anchored once across the contract.

### Public functions

```clarity
(anchor-document (hash (buff 32)) (label (string-ascii 64)))
  ;; -> (response bool uint)
  ;; (ok true) on success, (err u100) if the hash is already anchored
```

### Read-only functions

```clarity
(get-anchor (hash (buff 32)))
  ;; -> (optional { anchored-by: principal, stacks-block: uint, burn-block: uint, label: (string-ascii 64) })

(is-anchored (hash (buff 32)))
  ;; -> bool
```

### Errors

| Constant              | Code   | Meaning                          |
| --------------------- | ------ | -------------------------------- |
| `ERR-ALREADY-ANCHORED`| `u100` | The hash is already anchored.    |

### Events

`anchor-document` prints `{ event: "anchor-created", hash, anchored-by, stacks-block, burn-block, label }`.

---

## thesislock-batch

Batch anchors of up to ten hashes per transaction. Records are keyed by both the hash and
the owner, so the same hash can be anchored independently by different wallets. Anchoring
the same hash twice for one owner is silently skipped.

### Public functions

```clarity
(anchor-batch (entries (list 10 { hash: (buff 32), label: (string-ascii 64) })))
  ;; -> (response uint uint)
  ;; (ok batch-id) where batch-id is a new incrementing id
```

### Read-only functions

```clarity
(get-batch-anchor (hash (buff 32)) (owner principal))
  ;; -> (optional { label: (string-ascii 64), stacks-block: uint, burn-block: uint, batch-id: uint })

(get-batch-count)
  ;; -> uint   ;; total number of batch transactions recorded
```

### Errors

None defined.

### Events

`anchor-batch` prints `{ event: "batch-anchored", batch-id, owner, count, stacks-block, burn-block }`.

---

## thesislock-registry

A per-principal, append-only index of anchors that powers wallet history. Each entry is
stored under an incrementing index for the owner.

### Public functions

```clarity
(register-anchor (hash (buff 32)) (label (string-ascii 64)))
  ;; -> (response uint uint)
  ;; (ok index) the zero-based index assigned to this entry for the caller
```

### Read-only functions

```clarity
(get-anchor-at (owner principal) (index uint))
  ;; -> (optional { hash: (buff 32), label: (string-ascii 64), anchored-at: uint })

(get-anchor-count (owner principal))
  ;; -> uint

(get-recent-anchors (owner principal))
  ;; -> (list 10 (optional { hash: (buff 32), label: (string-ascii 64), anchored-at: uint }))
  ;; newest first; up to ten entries
```

`anchored-at` is the Stacks block height at registration.

### Errors

None defined.

### Events

`register-anchor` prints `{ event: "anchor-registered", owner, index, hash, label, anchored-at }`.

---

## thesislock-proof

A soulbound SIP-009 proof NFT. Minting anchors a hash and issues a non-transferable token
to the minter. Each unique hash can back at most one token, and transfers are always
rejected.

### Public functions

```clarity
(mint-proof (hash (buff 32)) (label (string-ascii 64)))
  ;; -> (response uint uint)
  ;; (ok token-id) on success, (err u409) if a proof already exists for the hash

(transfer (token-id uint) (sender principal) (recipient principal))
  ;; -> (response bool uint)
  ;; always (err u401): the token is soulbound and cannot move
```

### Read-only functions

```clarity
(get-last-token-id)                  ;; -> (response uint uint)
(get-token-uri (token-id uint))      ;; -> (response (optional (string-ascii ...)) uint)
(get-owner (token-id uint))          ;; -> (response (optional principal) uint)
(get-proof (token-id uint))          ;; -> (optional { hash, label, anchored-by, stacks-block, burn-block })
(get-token-id-by-hash (hash (buff 32)))  ;; -> (optional uint)
(get-proof-by-hash (hash (buff 32)))     ;; -> (optional { hash, label, anchored-by, stacks-block, burn-block })
```

`get-token-uri` returns the template `https://thesis-lock.vercel.app/api/nft/{id}`, which
serves SIP-009 metadata. See [`/api/nft/<id>`](/reference/rest-api/#get-apinftid).

### Errors

| Constant             | Code   | Meaning                                   |
| -------------------- | ------ | ----------------------------------------- |
| `ERR-SOULBOUND`      | `u401` | Transfers are rejected; the token is soulbound. |
| `ERR-DUPLICATE-HASH` | `u409` | A proof already exists for this hash.     |

### Events

`mint-proof` prints `{ event: "proof-minted", token-id, hash, anchored-by, stacks-block, burn-block }`.

---

## thesislock-groups

Named groups for collaborative anchoring. An admin creates a group and manages members; any
member can anchor to the group's shared, ordered history.

### Public functions

```clarity
(create-group (name (string-ascii 64)))
  ;; -> (response uint uint)  ;; (ok group-id); caller becomes admin and first member

(add-member (group-id uint) (member principal))
  ;; -> (response bool uint)  ;; admin only

(remove-member (group-id uint) (member principal))
  ;; -> (response bool uint)  ;; admin only; cannot remove the admin

(anchor-to-group (group-id uint) (hash (buff 32)) (label (string-ascii 64)))
  ;; -> (response uint uint)  ;; (ok index); members only
```

### Read-only functions

```clarity
(get-group (group-id uint))
  ;; -> (optional { name: (string-ascii 64), admin: principal, created-at: uint })

(is-member (group-id uint) (who principal))     ;; -> bool
(get-group-anchor-count (group-id uint))        ;; -> uint

(get-group-anchor-at (group-id uint) (index uint))
  ;; -> (optional { hash: (buff 32), label: (string-ascii 64), anchored-by: principal, stacks-block: uint })

(get-recent-group-anchors (group-id uint))
  ;; -> (list 10 (optional { hash, label, anchored-by, stacks-block }))  ;; newest first
```

### Errors

| Constant                 | Code   | Meaning                                    |
| ------------------------ | ------ | ------------------------------------------ |
| `ERR-NOT-ADMIN`          | `u403` | Caller is not the group admin.             |
| `ERR-NOT-MEMBER`         | `u403` | Caller is not a member of the group.       |
| `ERR-CANNOT-REMOVE-SELF` | `u400` | The admin cannot be removed from the group.|

### Events

`create-group`, `add-member`, `remove-member`, and `anchor-to-group` print
`group-created`, `member-added`, `member-removed`, and `group-anchor-added` events
respectively.
