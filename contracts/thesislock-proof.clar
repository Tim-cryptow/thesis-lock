;; thesislock-proof
;; Soulbound proof-of-existence NFT. Minting a proof anchors a SHA-256 hash
;; and issues a non-transferable SIP-009 token to the minter. The token stays
;; in the minter's wallet as permanent evidence of the anchor. Transfers are
;; rejected, and each unique hash can back at most one proof token.

(define-non-fungible-token thesislock-proof uint)

(define-constant ERR-SOULBOUND (err u401))
(define-constant ERR-DUPLICATE-HASH (err u409))

(define-data-var last-token-id uint u0)

(define-map proof-data
  uint
  {
    hash: (buff 32),
    label: (string-ascii 64),
    anchored-by: principal,
    stacks-block: uint,
    burn-block: uint
  }
)

(define-map hash-to-token (buff 32) uint)

(define-public (mint-proof (hash (buff 32)) (label (string-ascii 64)))
  (let
    (
      (token-id (+ (var-get last-token-id) u1))
    )
    (asserts! (map-insert hash-to-token hash token-id) ERR-DUPLICATE-HASH)
    (try! (nft-mint? thesislock-proof token-id tx-sender))
    (var-set last-token-id token-id)
    (map-set proof-data token-id {
      hash: hash,
      label: label,
      anchored-by: tx-sender,
      stacks-block: stacks-block-height,
      burn-block: burn-block-height
    })
    (print {
      event: "proof-minted",
      token-id: token-id,
      hash: hash,
      anchored-by: tx-sender,
      stacks-block: stacks-block-height,
      burn-block: burn-block-height
    })
    (ok token-id)
  )
)

;; SIP-009: soulbound tokens cannot move. Always reject.
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  ERR-SOULBOUND
)

(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

(define-read-only (get-token-uri (token-id uint))
  (ok (some "https://thesis-lock.vercel.app/api/nft/{id}"))
)

(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? thesislock-proof token-id))
)

(define-read-only (get-proof (token-id uint))
  (map-get? proof-data token-id)
)

(define-read-only (get-token-id-by-hash (hash (buff 32)))
  (map-get? hash-to-token hash)
)

(define-read-only (get-proof-by-hash (hash (buff 32)))
  (match (map-get? hash-to-token hash)
    token-id (map-get? proof-data token-id)
    none
  )
)
