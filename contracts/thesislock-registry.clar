;; thesislock-registry
;; Per-principal anchor index. Each call appends to an ordered list
;; keyed by { owner, index } and bumps a per-owner count. Enables
;; "my anchors" history without an off-chain indexer.

(define-map anchor-index
  { owner: principal, index: uint }
  {
    hash: (buff 32),
    label: (string-ascii 64),
    anchored-at: uint
  }
)

(define-map anchor-count principal uint)

(define-public (register-anchor (hash (buff 32)) (label (string-ascii 64)))
  (let
    (
      (current-count (default-to u0 (map-get? anchor-count tx-sender)))
    )
    (map-set anchor-index
      { owner: tx-sender, index: current-count }
      {
        hash: hash,
        label: label,
        anchored-at: stacks-block-height
      }
    )
    (map-set anchor-count tx-sender (+ current-count u1))
    (print {
      event: "anchor-registered",
      owner: tx-sender,
      index: current-count,
      hash: hash,
      label: label,
      anchored-at: stacks-block-height
    })
    (ok current-count)
  )
)

(define-read-only (get-anchor-at (owner principal) (index uint))
  (map-get? anchor-index { owner: owner, index: index })
)

(define-read-only (get-anchor-count (owner principal))
  (default-to u0 (map-get? anchor-count owner))
)

(define-private (read-back (owner principal) (count uint) (offset uint))
  (if (>= offset count)
    none
    (map-get? anchor-index
      { owner: owner, index: (- (- count u1) offset) }
    )
  )
)

(define-read-only (get-recent-anchors (owner principal))
  (let
    (
      (count (default-to u0 (map-get? anchor-count owner)))
    )
    (list
      (read-back owner count u0)
      (read-back owner count u1)
      (read-back owner count u2)
      (read-back owner count u3)
      (read-back owner count u4)
      (read-back owner count u5)
      (read-back owner count u6)
      (read-back owner count u7)
      (read-back owner count u8)
      (read-back owner count u9)
    )
  )
)
