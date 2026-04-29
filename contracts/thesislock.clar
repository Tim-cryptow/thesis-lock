;; thesislock-v1
;; Hash-anchor for documents. Stores SHA-256 hash with signer,
;; block heights, and label. Once anchored, a hash is permanent.

(define-constant ERR-ALREADY-ANCHORED (err u100))

(define-map anchors
  (buff 32)
  {
    anchored-by: principal,
    stacks-block: uint,
    burn-block: uint,
    label: (string-ascii 64)
  }
)

(define-public (anchor-document (hash (buff 32)) (label (string-ascii 64)))
  (begin
    (asserts! (is-none (map-get? anchors hash)) ERR-ALREADY-ANCHORED)
    (map-set anchors hash {
      anchored-by: tx-sender,
      stacks-block: stacks-block-height,
      burn-block: burn-block-height,
      label: label
    })
    (print {
      event: "anchor-created",
      hash: hash,
      anchored-by: tx-sender,
      stacks-block: stacks-block-height,
      burn-block: burn-block-height,
      label: label
    })
    (ok true)
  )
)

(define-read-only (get-anchor (hash (buff 32)))
  (map-get? anchors hash)
)

(define-read-only (is-anchored (hash (buff 32)))
  (is-some (map-get? anchors hash))
)
