---
title: Perpetual Futures
description: How Fermi perps work and where each risk mechanism fits
---

# Perpetual Futures

Perpetual futures are leveraged contracts that track an underlying
asset and never expire. Fermi uses them to let you go long or short
with posted collateral, against a real on-chain order book, and to
keep a position open indefinitely as long as your margin stays
healthy.

## How a perp differs from spot

In spot trading you buy or sell the asset itself. In perps you trade
synthetic exposure:

- Your PnL is driven by the mark price moving versus your entry price.
- Leverage comes from posting only a fraction of notional as
  collateral.
- **Funding** transfers value between longs and shorts to keep the perp
  anchored to the underlying market.
- **Liquidation** rules enforce solvency when collateral is no longer
  sufficient.

## The core moving parts

**Entry price and PnL.** Every position has an effective entry price
and accumulates unrealized PnL as the mark price moves. See
[Entry Price & PnL](21-entry-price-and-pnl.md).

**Mark / oracle price.** Fermi marks positions to a robust oracle
price for PnL and maintenance health, and uses a slower stable-price
band when you open new exposure. See
[Pricing & Mark Price](13-pricing-and-mark-price.md).

**Funding.** Because perps never expire, funding is what keeps the
contract aligned with the underlying over time. It accrues
continuously and settles into your position automatically. See
[Funding](14-funding.md).

**Margin.** A single cross-margin account lets you take positions
larger than your collateral alone would support — while accepting
liquidation risk if losses, funding, or changing requirements erode
your collateral. See [Margin & Account Health](20-margin-and-health.md).

**Liquidation and backstops.** If maintenance health goes negative,
your account becomes liquidatable: anyone can step in to reduce its
exposure at a small discount. If losses exceed collateral, an
insurance fund and, as a last resort, socialized loss preserve the
exchange's solvency. See [Liquidations](22-liquidations.md) and
[Bankruptcy & Insurance Fund](23-bankruptcy-and-insurance.md).

## How fills happen

Orders are sequenced first-come-first-served by the
[POSq sequencing layer](05-posq-sequencing-layer.md), which in v1 orders
encrypted intents over VDF ticks. The resulting position is locked on chain,
then matched against the [order book](15-order-book.md) by a
deterministic [matching engine](16-matching-engine.md). You see a
[pre-confirmation](07-fast-pre-confirmations.md) of your fill in
milliseconds; finality follows a beat behind.

## Where to go next

- New here? Read [Getting Started](02-getting-started.md), then
  [Order Types](17-order-types.md).
- Want to understand liquidation risk? Read
  [Margin & Account Health](20-margin-and-health.md).
- Building a bot? See [Trader Workflow](26-trader-workflow.md) and
  [API & SDK](27-api-and-sdk.md).
