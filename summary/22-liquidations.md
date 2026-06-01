---
title: Liquidations
description: When liquidation happens, how it proceeds, and what it costs
---

# Liquidations

Liquidation is the permissionless process that reduces an underwater
account's exposure to restore solvency. There are no per-position
margin tiers — the same single rule applies to every account.

## The trigger

An account becomes liquidatable when its **maintenance health goes
negative**. Maintenance health uses oracle prices and maintenance
weights. Anyone who sees an account cross that line can liquidate it;
the liquidator takes over exposure at a small discount and books the
discount as profit. This open, competitive design means there is no
privileged liquidator and no waiting on an operator.

## How far a liquidation goes

A liquidation is bounded so the account isn't reduced more than
necessary. Each step rechecks **liquidation-end health** and stops as
soon as it is back to non-negative. Because liquidation-end is slightly
stricter than the maintenance trigger, the account exits with a small
buffer above zero and isn't immediately re-liquidatable.

## The order of operations

A liquidator works through an account in a sensible order:

1. **Free up orders.** Any resting orders are force-cancelled so the
   liquidator can act on the underlying position. No fee is charged for
   this.
2. **Reduce perp exposure.** Base exposure is transferred from the
   liquidated account to the liquidator at the oracle price adjusted by
   the liquidation fee — slightly unfavorable to the account being
   liquidated.
3. **Claim positive PnL at a discount, or absorb negative PnL.**
   Depending on what's left, the liquidator settles profitable legs at
   a discount, or absorbs residual losses for a fee.
4. **Reduce spot borrows.** On the collateral side, the liquidator
   repays a borrow and takes equivalent collateral plus the fee.
5. **Loop** until liquidation-end health is non-negative, or the
   account is bankrupt — see
   [Bankruptcy & Insurance Fund](23-bankruptcy-and-insurance.md).

## What it costs you

If you get liquidated, you lose the liquidation-fee discount on every
unit of exposure reduced and on any positive PnL claimed, plus the
platform's cut. Your resting orders are cancelled, which means any
stop-loss logic you had resting is gone too.

## How to avoid it

- Keep **init health well above zero** — the gap between init and
  maintenance is your cushion.
- Use **reduce-only** orders for stops so an accidental flip can't push
  you negative. See [Order Types](17-order-types.md).
- Subscribe to your account stream and set a warning threshold so you
  can add collateral or close before maintenance health goes red. See
  [Margin & Account Health](20-margin-and-health.md).

## Retiring markets

A market being wound down can be set to reduce-only, and a fully
retiring market can force residual positions closed at the oracle
price. These are lifecycle tools, distinct from health-triggered
liquidation.
