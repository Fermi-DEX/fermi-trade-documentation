# FLP safety controls and recovery

Recovery reduces inventory so the vault can meet exits. It does not guarantee a counterparty, a fresh oracle or available quote-bank liquidity. The latest source has different rules for privileged intervention, permissionless withdrawal recovery and final closure.

## Stop quoting first

Admin/guardian delegate removal revokes future delegate authorization. It does not itself cancel resting orders. Use the supported cancel path as well and consume events before relying on resulting account state.

The permissionless breaker checks conservative per-share drawdown and the configured initial-health ratio. A trip pauses deposits, removes the delegate and clears the proposal/restore state as implemented. Someone must submit the check; a threshold is not an autonomous background process. An admin reset establishes a new reference and is separate from restoring trading authority.

## Recovery triggers

| Caller and action | Preconditions in the reviewed source |
| --- | --- |
| Admin or guardian: full unwind | May initiate directly under mode/state checks |
| Admin or guardian: batch-proportional unwind | Oldest deferred batch and proportional grace from its close time |
| Public caller: proportional unwind | Oldest deferred batch has a recorded eligible-close funding failure for cash (2) or health (3), and the corresponding grace has elapsed |
| Public caller: full escalation | Same reason-based evidence and full grace, plus an active proportional unwind |
| Admin or guardian: `trigger_partial_unwind` | Explicit bounded fraction, without requiring a deferred batch |

The public recovery clock uses the first recorded funding-failure time for the current head; eligibility follows the latest recorded failure reason. A missed funding window or bank-wide liquidity failure alone does not authorize public forced liquidation of inventory. A breaker trip alone does not either.

Read configured grace periods and pending parameter changes. Staged recovery parameters also enforce timing relationships so a public trigger cannot precede the intended opportunity for an eligible close.

## Proportional reduction

For batch recovery, the initial fraction is the head batch's shares divided by **current** effective supply. It reduces each active perp toward a signed target. This avoids using stale close-time supply after earlier batches have left the pool.

`unwind_step` constructs a reduce-only IOC under oracle-band, quote-size and health-aware sizing constraints. Keepers consume fills and settle PnL. Reaching a target does not prove the payout is fundable.

If an eligible close reaches the target but still fails cash or health funding, it extends targets by the measured shortfall, with a minimum 50% further cut of remaining inventory. In integer terms, it keeps `10,000 − clamp(shortfall_bps, 5,000, 10,000)` basis points of the current signed position, truncating toward zero. Bank-liquidity failure does not trigger this extra trading.

After required targets and all locked/deferred withdrawals are cleared, proportional `finish_unwind` can restore the saved delegate and prior deposit-open state. A breaker or admin/guardian veto prevents that automatic restoration. This is different from older notes that required manual re-delegation after every proportional recovery.

## Full recovery and residual PnL

Full recovery requires flat base positions, no outstanding order/taker exposure, quote-only nonnegative token assets and the required residual-PnL treatment. Pending vault events must be resolved by the applicable pricing checks.

Negative residual perp quote is not ignored: terminal finish reserves enough spot quote in the core account to cover it. Positive residual PnL that cannot find a settlement counterparty can be forfeited only after `grace_full_s` from unwind start. Full-ready withdrawal pricing applies a 100% positive-PnL haircut so an uncollectible gain cannot fund an exit on paper.

When all locked/deferred batches are resolved, `finish_unwind` transfers available terminal cash to redemption escrow, records actual terminal assets and effective supply, and marks the vault closed. Terminal redemptions use that fixed ratio without virtual offsets. Existing funded claims remain distinct from terminal equity cash. Losses and rounding can make terminal payout lower than historical NAV.

## Abort and residual tokens

Before closure, the admin can `abort_unwind`. It clears recovery mode/targets, leaves deposits paused and no active delegate, and preserves deferred equity, funded claims and refundable held deposits. The normal controls are needed to resume trading. A public trigger may become available again under its reason-based rules.

`recover_token` provides a constrained sale path for residual non-quote tokens during full recovery. It is not discretionary authority to send arbitrary assets to any recipient at any price.

## Timelocks and upgrades

Vault parameter staging uses a delay based on the configured timelock and relevant epoch/cutoff schedules. Fee changes also require same-timestamp accrual. Delegate proposals use their activation delay. Emergency controls have intentionally different authority and timing.

None of these vault-level delays restricts the Solana loader's program upgrade authority. Deployment governance must be evaluated separately.


## Implementation reference

Reviewed at `90267b20`. [recovery.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/recovery.rs) · [recovery_sizing.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/recovery_sizing.rs) · [common.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/common.rs) · [close_epoch.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/close_epoch.rs) · [admin.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/admin.rs) · [keeper.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/keeper.rs) · [state.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/state.rs). Source links require access to the implementation repository.
