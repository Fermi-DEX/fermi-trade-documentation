# FLP deposits, graduation and withdrawals

A user's exposure changes at pricing and funding transitions, not merely when a token appears or disappears in the wallet. This chapter follows those transitions.

## Public pre-deposits

Before graduation, a public pre-deposit moves USDC to deposit escrow and records principal. It mints no trading shares and receives no trading PnL. `pre_withdraw_v3` returns principal before graduation without an epoch cutoff. Trading pauses, recovery or closure before graduation do not turn that principal into strategy capital.

An approved wallet can instead use `permissioned_deposit` to put capital directly into trading and receive shares at fresh NAV_high after applicable accrual and fees. This is a different operation; a generic public deposit helper may select the escrow path.

The latest source also supports `permissioned_withdraw` before graduation: an approved holder can redeem live shares at current NAV_low, with slippage and funding checks, only when no older deferred batch exists and relevant safety states permit it. It is not a general instant-exit path for public live LPs.

## Graduation

The admin's `graduate` call moves public principal into the trading account and reserves the corresponding shares as owed-but-unminted. Conversion uses NAV_mid and effective supply with the program's pricing offsets. Public LPs begin bearing strategy PnL at graduation, even if they claim tokens later.

The program checks positive conservative NAV, withdrawal pause state, breaker conditions and, when public principal is being converted, a maximum price-disagreement spread of 2% of NAV_mid. That spread uses NAV_low with the positive-PnL haircut removed; the haircut is a valuation policy, not oracle/stable-price disagreement. Graduation is one-way. A proposed launch date in an operations document is not an enforced timestamp.

## Live deposit tickets

`request_deposit` transfers gross USDC to escrow and records gross/net amounts for a target epoch. Before the cutoff it targets the current epoch; at or after the cutoff it targets the next. A user has one deposit ticket and may add only to the same target epoch until that ticket is resolved.

At close, eligible deposits buy shares at the fixed NAV_high ratio. Their gross cash enters trading and their share entitlement enters `owed_unminted_shares`. `claim_deposit` later mints the user's shares without changing effective supply.

A close can hold deposits because of recovery, cap or valuation conditions, or a recognized core-deposit refusal. Held deposits buy no shares and are refundable through `refund_pending_deposit`. An unexpected transaction error rolls back the close; it must not be displayed as a completed held-deposit transition.

## Withdrawal tickets

`request_withdraw` burns shares and adds them to `locked_shares`. It also records released cost basis. The user no longer has those tokens in the wallet, but still owns equity exposure through the ticket.

At close, requests become deferred epoch batches in a FIFO. Funding removes a batch's locked shares from effective supply and moves its net payout into redemption escrow. Only then is the payout ratio fixed for claims. Anyone may submit `claim_withdrawal`, but the program pays the ticket owner's canonical quote ATA.

An eligible cancellation reverses a request before its cutoff, or while it targets a future epoch. It is not a right to withdraw an already deferred batch from the funding queue at a preferred price.

## What one close does

1. Validate the supplied epoch records and deferred FIFO prefix, and reject relevant unconsumed vault events.
2. Sweep idle cash where possible, compute fresh NAV and accrue fees once.
3. Fix one post-fee, pre-flow pricing snapshot.
4. Admit or hold the current epoch's deposits.
5. Attempt oldest withdrawal batches in order, refreshing cash/health feasibility after flows.
6. Record outcomes and advance the epoch.

One close funds at most two batches. It stops at the first unfundable batch; it neither partially funds that batch nor passes it to pay a smaller later one. Incoming deposits and earlier payouts do not reprice exits within that close.

## Eligibility and cash checks

Normal funding is allowed from the scheduled epoch end through `end + equity_window_s`, inclusive. The configured window is bounded to 300–7,200 seconds. A late close can advance accounting without funding exits. Completed full recovery has a separate window exception.

| Funding result | Meaning |
| --- | --- |
| Ineligible 1 | Outside the funding window |
| Ineligible 2 | Recovery targets are not yet met |
| Skip reason 1 | Conservative NAV is not positive for normal funding |
| Skip reason 2 | Insufficient spot quote for the required core payout |
| Skip reason 3 | Post-payout initial-health ratio below the configured floor |
| Skip reason 4 | Insufficient quote-bank vault liquidity |

Idle quote is used first. The remaining core payout must be feasible without borrowing. When idle cash covers the entire payout, the implementation does not need a core withdrawal check; do not infer core collateral from idle cash.

## The guarded cure exception

The admin or active delegate can call `cure_deferred` outside ordinary epoch-close funding, while not unwinding or closed. It funds only the oldest deferred batch at that batch's recorded close ratio. Current NAV_low per share, adjusted for fees that would accrue now, must be at least that ratio. It also checks current cash, health, bank liquidity and pending events.

Thus a cure cannot choose a lower current price to reduce the old batch's payout. Normal future closes still price unfunded equity at their own funding snapshot. An indexer must distinguish these two funding paths.


## Implementation reference

Reviewed at `90267b20`. [lifecycle.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/lifecycle.rs) · [permissioned.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/permissioned.rs) · [deposit.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/deposit.rs) · [withdraw.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/withdraw.rs) · [close_epoch.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/close_epoch.rs). Source links require access to the implementation repository.
