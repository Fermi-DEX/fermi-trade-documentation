# stressed withdrawals and recovery

A deferred withdrawal does not automatically mean an emergency.
The vault can have sufficient equity but lack immediately available USDC.
Funds can also remain inside the core account or depend on event consumption and PnL settlement.

## Routine funding

During the scheduled funding window, keepers can fund the oldest eligible batch through `fund_head_v2`.
This transaction prices the batch at current withdrawal NAV and applies the actual core withdrawal and health checks.

A settlement worker collects eligible PnL. An event-consumption worker applies completed trades to core accounts.
These workers perform different tasks. Event consumption alone does not convert positive PnL into available USDC.

The delegate can continue ordinary quoting when the applicable on-chain checks permit it.
The program's temporary event projection helps valuation during continuous quoting. It does not guarantee that every payment can execute immediately.

`PendingCoreSettlement` identifies a narrow event-consumption dependency.
It is not a generic label for RPC errors, invalid accounts, insufficient cash, or every failed health check.
This reason does not start a new permissionless-recovery clock.

## Recovery eligibility

The deployed program limits the public recovery clock to its eligible core-cash-shortfall reason, code `2`.
A routine funding-required reason does not, by itself, authorize a public unwind.
The API reports the current reason and earliest eligible trigger times.
A null trigger time means that the reader has no currently eligible time to report.

The current proportional grace period is 93,600 seconds, or 26 hours.
The current full-recovery grace period is 604,800 seconds, or seven days.
These periods apply to the program's qualifying failure state. They are not general withdrawal deadlines.
Public full recovery also requires the prior proportional-recovery state.

The administrator and guardian have additional recovery paths. Their authority and prerequisites differ from the public paths.

## What recovery does

Proportional recovery reduces the relevant trading inventory toward stored targets so the oldest batch can receive payment.
Full recovery seeks to remove trading inventory and prepare terminal redemption.
Both paths remain subject to order-book liquidity and the program's execution limits.

Recovery removes the trading delegate and restricts new user flows.
Orders can be canceled, and bounded unwind transactions reduce positions.
The current oracle band is 75 basis points. The configured maximum step size is 50,000 USDC.
These are limits, not a promise that each step can trade that amount.

An unfilled step does not establish progress. The recorded targets and completed payments determine progress.
An administrator can widen applicable recovery limits under the program rules.
With the current zero timelock, an eligible widening can take effect immediately.

## Completion and interruption

A completed proportional recovery can restore the saved delegate.
An explicit delegate removal vetoes that restoration. A deposit pause set during recovery survives automatic completion.
The administrator must clear that pause separately.

Aborting an unwind does not reset the deferred head's qualifying failure clock.
An abort also does not turn an unfunded ticket into a funded claim.

Full recovery can end in a closed vault with terminal assets and supply recorded on chain.
Users then redeem eligible shares through the terminal path. Existing funded claims retain their separate escrow-backed claim path.

## Liquidation

The core program can mark the vault account as being liquidated.
That state blocks ordinary share pricing. An approved immediate deposit cannot bypass that pricing restriction.

The operator can fund the authority's idle USDC account and call `sweep_idle` to attempt a qualifying liquidation cure.
The core must accept the deposit and the required post-deposit health assertion.
A failed cure does not establish that the account recovered.

Source: [Deployed FLP program](https://github.com/Fermi-DEX/fermi-v1-programs/tree/623f113075bd124948eabac8589bfbe8c53b11e8/flp/programs/flp-vault/src).
