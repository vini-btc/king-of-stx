;; title: King Of STX
;; version: 0.0.1
;; summary: A simple fun money game in STX
;; description: Be the last wallet to fund the prize pool in X blocks and win the prize pool. But X becomes smaller as the prize pool gets bigger!

(define-constant contract-principal (as-contract tx-sender))
(define-constant admin 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)

;; Errors
(define-constant unauthorized (err u401))
(define-constant forbidden (err u403))

(define-data-var king (optional principal) none)
(define-data-var king-height (optional uint) none)

(define-private (get-min-blocks-for-given-prize)
    (let
      ((prize (stx-get-balance contract-principal)))
    (if (<= prize u10000000) ;; < 10 STX
      u100
      (if (<= prize u100000000) ;; < 100 STX
        u10
        u1))))

(define-public (become-king)
  (let
      ((prize (stx-get-balance contract-principal))
      (ticket
        (if (<= prize u10000000)
          u500000
          (if (<= prize u100000000)
            u1000000
            u1500000)))
      (fee (/ ticket u10))
      (pool-contribution (- ticket fee)))
    (try! (stx-transfer? pool-contribution contract-caller contract-principal))
    (try! (stx-transfer? fee contract-caller admin))
    (var-set king (some contract-caller))
    (var-set king-height (some stacks-block-height))
    (ok true)))

(define-public (get-prize)
  (let
    ((prize-recipient contract-caller))
    (asserts! (is-eq (unwrap! (var-get king) unauthorized) prize-recipient) unauthorized)
    (asserts! (>= (- stacks-block-height (unwrap! (var-get king-height) unauthorized)) (get-min-blocks-for-given-prize)) forbidden)
    (try! (as-contract (stx-transfer? (stx-get-balance contract-principal) contract-principal prize-recipient)))
    (var-set king none)
    (var-set king-height none)
    (ok true)))

;; Transfers 10 STX to the contract to make up the starting prize pool 
(stx-transfer? u5000000 tx-sender contract-principal)