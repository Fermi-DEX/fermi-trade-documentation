---
title: Market Specs
description: Lot sizes, tick sizes, leverage, and per-market parameters
---

# Market Specs

Each perp market is configured with a set of parameters that define
how orders are priced and sized, how much leverage is available, and
how risk is managed. The live values for every market are published in
the app and via the SDK; this page explains what each parameter means.

## Sizing and pricing

- **Base lot size.** The smallest increment of position size. Order
  sizes are integer multiples of the base lot.
- **Tick / price lot size.** The smallest increment of price. Prices
  on the book are integer multiples of the tick.

These two together define the precision of the market. Orders that
don't fall on a valid lot or tick are rejected.

## Leverage and weights

Fermi does not use a separate stepped "leverage tier" table. Effective
leverage falls out of the **collateral weights** and **position
weights** for the market: the closer a weight is to full value, the
more leverage your collateral supports, bounded by the liquidation
buffer.

Each market defines:

- **Init and maintenance base weights** — how a long or short position
  counts toward init health (opening) and maintenance health
  (liquidation trigger).
- **An overall PnL cap** — a knob that controls how much positive
  unrealized PnL on this market can help your health elsewhere before
  you settle it to USDC. Setting it low isolates a market's PnL until
  realized.

See [Margin & Account Health](20-margin-and-health.md) for how these
feed into health.

## Funding parameters

- **Min / max funding** — the bounds on the daily funding rate.
- **Impact quantity** — the notional used to derive the book's impact
  price, which the funding rate is computed against.

See [Funding](14-funding.md).

## Fee parameters

- **Maker fee** — paid (or rebated, if negative) to the resting side.
- **Taker fee** — paid by the crossing side.
- **Fee penalty** — a flat fee on market/IOC orders, charged on
  placement.
- **Liquidation fees** — the discount a liquidator earns and the
  platform's cut.

See [Fees](19-fees.md).

## Lifecycle controls

- **Reduce-only mode** — restricts the market to position-reducing
  orders only, used when winding a market down.
- **Force-close** — lets a retiring market close residual positions at
  the oracle price.

## Live markets

Fermi launches with major perps (for example SOL-PERP, ETH-PERP,
BTC-PERP). The current list of markets, their addresses, and their
exact parameters are available in the app and through the
[API & SDK](27-api-and-sdk.md).
