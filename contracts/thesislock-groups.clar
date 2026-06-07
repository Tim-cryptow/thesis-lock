;; thesislock-groups
;; Named groups for collaborative document anchoring. An admin creates a
;; group and adds members; any member can anchor document hashes under the
;; group, building a shared, ordered history keyed by { group-id, index }.
;; Use cases: a thesis committee collecting drafts, a legal team organizing
;; filings, a research lab timestamping datasets.

(define-constant ERR-NOT-ADMIN (err u403))
(define-constant ERR-NOT-MEMBER (err u403))
(define-constant ERR-CANNOT-REMOVE-SELF (err u400))

(define-data-var group-counter uint u0)

(define-map groups
  uint
  {
    name: (string-ascii 64),
    admin: principal,
    created-at: uint
  }
)

(define-map group-members
  { group-id: uint, member: principal }
  { added-at: uint }
)

(define-map group-anchors
  { group-id: uint, index: uint }
  {
    hash: (buff 32),
    label: (string-ascii 64),
    anchored-by: principal,
    stacks-block: uint
  }
)

(define-map group-anchor-count uint uint)

(define-public (create-group (name (string-ascii 64)))
  (let
    (
      (new-id (+ (var-get group-counter) u1))
    )
    (var-set group-counter new-id)
    (map-set groups new-id {
      name: name,
      admin: tx-sender,
      created-at: stacks-block-height
    })
    (map-set group-members
      { group-id: new-id, member: tx-sender }
      { added-at: stacks-block-height }
    )
    (print {
      event: "group-created",
      group-id: new-id,
      name: name,
      admin: tx-sender,
      created-at: stacks-block-height
    })
    (ok new-id)
  )
)

(define-public (add-member (group-id uint) (member principal))
  (let
    (
      (group (unwrap! (map-get? groups group-id) ERR-NOT-ADMIN))
    )
    (asserts! (is-eq tx-sender (get admin group)) ERR-NOT-ADMIN)
    (map-set group-members
      { group-id: group-id, member: member }
      { added-at: stacks-block-height }
    )
    (print {
      event: "member-added",
      group-id: group-id,
      member: member,
      added-at: stacks-block-height
    })
    (ok true)
  )
)

(define-public (remove-member (group-id uint) (member principal))
  (let
    (
      (group (unwrap! (map-get? groups group-id) ERR-NOT-ADMIN))
    )
    (asserts! (is-eq tx-sender (get admin group)) ERR-NOT-ADMIN)
    (asserts! (not (is-eq member (get admin group))) ERR-CANNOT-REMOVE-SELF)
    (map-delete group-members { group-id: group-id, member: member })
    (print {
      event: "member-removed",
      group-id: group-id,
      member: member
    })
    (ok true)
  )
)

(define-public (anchor-to-group
    (group-id uint)
    (hash (buff 32))
    (label (string-ascii 64)))
  (let
    (
      (current-count (default-to u0 (map-get? group-anchor-count group-id)))
    )
    (asserts!
      (is-some (map-get? group-members { group-id: group-id, member: tx-sender }))
      ERR-NOT-MEMBER)
    (map-set group-anchors
      { group-id: group-id, index: current-count }
      {
        hash: hash,
        label: label,
        anchored-by: tx-sender,
        stacks-block: stacks-block-height
      }
    )
    (map-set group-anchor-count group-id (+ current-count u1))
    (print {
      event: "group-anchor-added",
      group-id: group-id,
      index: current-count,
      hash: hash,
      label: label,
      anchored-by: tx-sender,
      stacks-block: stacks-block-height
    })
    (ok current-count)
  )
)

(define-read-only (get-group (group-id uint))
  (map-get? groups group-id)
)

(define-read-only (is-member (group-id uint) (who principal))
  (is-some (map-get? group-members { group-id: group-id, member: who }))
)

(define-read-only (get-group-anchor-count (group-id uint))
  (default-to u0 (map-get? group-anchor-count group-id))
)

(define-read-only (get-group-anchor-at (group-id uint) (index uint))
  (map-get? group-anchors { group-id: group-id, index: index })
)

(define-private (read-group-back (group-id uint) (count uint) (offset uint))
  (if (>= offset count)
    none
    (map-get? group-anchors
      { group-id: group-id, index: (- (- count u1) offset) }
    )
  )
)

(define-read-only (get-recent-group-anchors (group-id uint))
  (let
    (
      (count (default-to u0 (map-get? group-anchor-count group-id)))
    )
    (list
      (read-group-back group-id count u0)
      (read-group-back group-id count u1)
      (read-group-back group-id count u2)
      (read-group-back group-id count u3)
      (read-group-back group-id count u4)
      (read-group-back group-id count u5)
      (read-group-back group-id count u6)
      (read-group-back group-id count u7)
      (read-group-back group-id count u8)
      (read-group-back group-id count u9)
    )
  )
)
