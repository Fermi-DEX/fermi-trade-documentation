---
title: Self-Trade Prevention
description: What happens when your order would match your own liquidity
---

# Self-Trade Prevention

If a new order would match against a resting order owned by the **same
Fermi account**, the matching engine applies your chosen self-trade
behavior. This prevents wash trades and lets you manage your own
quotes without trading with yourself by accident.

There are three modes:

## Decrement-take

The two orders match as normal, but **both legs are charged zero fees**.
A self-trade carries no fee revenue, so neither side pays maker or
taker fees on it.

- **Use for:** strategies where crossing your own order is acceptable
  and you simply don't want to pay fees on it.

## Cancel-provide

The resting (your own) order is cancelled rather than taken, and the
incoming order continues past it. No self-fill occurs.

- **Use for:** the common market-making case — you want your new order
  to replace, not trade against, your existing one.

## Abort-transaction

The whole order is rejected and the transaction reverts if a
self-collision would happen.

- **Use for:** the strictest setups, where any self-cross is treated as
  a bug to be surfaced rather than handled silently.

## Choosing a mode

Most market makers use **cancel-provide** so that refreshing a quote
never results in trading with themselves. Use **decrement-take** when a
self-cross is harmless and you just want it fee-free, and
**abort-transaction** when you'd rather fail loudly. The mode is set
per order — see [Order Types](17-order-types.md).
