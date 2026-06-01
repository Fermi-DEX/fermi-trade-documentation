---
title: Funding
description: How funding keeps the perp price anchored to spot
---

# Funding

Funding is the periodic value transfer that keeps a perpetual's price
anchored to the underlying spot market. Without it, a perp with no
expiry could drift away from spot indefinitely.

## Direction

- When the perp trades **above** the oracle, **longs pay shorts**.
- When the perp trades **below** the oracle, **shorts pay longs**.

The size of the payment is proportional to how far the book's price
sits from the oracle, bounded by per-market caps.

## Continuous accrual, automatic settlement

Fermi has **no fixed "funding hour."** Funding accrues continuously,
proportional to elapsed time and the current funding rate. It settles
into your position automatically whenever your position is touched —
when you place, cancel, fill, get liquidated, or settle. You never
have to manually claim or pay funding; it is folded into your quote
balance.

For longs, positive funding is debited; for shorts it is credited (and
the directions invert when the rate is negative).

## How the rate is computed

The instantaneous rate compares the order book's **impact price** (the
price you'd get sweeping a configured notional through the book) to the
oracle price, then clamps the result to the market's min/max funding
bounds. Edge cases are handled conservatively:

- If only one side of the book has liquidity, the rate clamps to the
  corresponding bound.
- If the book is empty on both sides, no funding accrues that interval.

## Rate conventions

Funding rates are configured as **per-day** values. To translate:

```
8-hour rate ≈ daily rate ÷ 3
1-hour rate ≈ daily rate ÷ 24
annualized  ≈ daily rate × 365
```

The dollar funding per contract per day is roughly the oracle price
times the daily rate, scaled by the contract's lot size.

## Robustness to outages

A single funding update can only ever apply up to a capped window
(about an hour) of accrual. So even if the chain is congested or
pauses, funding cannot compound a stale rate over a long gap in one
step — it catches up gradually across subsequent updates instead.

## Tracking your funding

The app and API expose a per-position funding history — funding paid
and received over time — which is useful for PnL and tax accounting.
See [API & SDK](27-api-and-sdk.md).
