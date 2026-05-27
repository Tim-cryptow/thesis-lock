;; thesislock-batch
;; Batch hash-anchoring. Anchor up to 10 document hashes in a single
;; transaction. Each entry is keyed by { hash, owner } so the same hash
;; can be anchored independently by different principals.
;; Duplicates for the same owner are silently skipped via map-insert.

(define-map batch-anchors
  { hash: (buff 32), owner: principal }
  {
    label: (string-ascii 64),
    stacks-block: uint,
    burn-block: uint,
    batch-id: uint
  }
)

(define-data-var batch-counter uint u0)

(define-private (insert-one
    (entry { hash: (buff 32), label: (string-ascii 64) })
    (batch-id uint))
  (begin
    (map-insert batch-anchors
      { hash: (get hash entry), owner: tx-sender }
      {
        label: (get label entry),
        stacks-block: stacks-block-height,
        burn-block: burn-block-height,
        batch-id: batch-id
      }
    )
    batch-id
  )
)

(define-public (anchor-batch
    (entries (list 10 { hash: (buff 32), label: (string-ascii 64) })))
  (let
    (
      (new-id (+ (var-get batch-counter) u1))
    )
    (var-set batch-counter new-id)
    (fold insert-one entries new-id)
    (print {
      event: "batch-anchored",
      batch-id: new-id,
      owner: tx-sender,
      count: (len entries),
      stacks-block: stacks-block-height,
      burn-block: burn-block-height
    })
    (ok new-id)
  )
)

(define-read-only (get-batch-anchor (hash (buff 32)) (owner principal))
  (map-get? batch-anchors { hash: hash, owner: owner })
)

(define-read-only (get-batch-count)
  (var-get batch-counter)
)
