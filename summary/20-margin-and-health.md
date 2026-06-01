---
title: Margin & Account Health
description: How collateral and positions become a single health number
---

# Margin & Account Health

Account health on Fermi is a single **signed-USD number**. Positive
means solvent, zero means at the edge, and negative (for the
maintenance flavor) means liquidatable. It is computed by walking every
position on your account and summing weighted contributions.

## Three flavors of health

| Flavor | Used for | Prices used |
| --- | --- | --- |
| **Init health** | Gating *opening* new exposure (orders, withdrawals) | Init weights, stable-price band (strictest) |
| **Maintenance health** | The *liquidation trigger* | Maintenance weights, oracle price |
| **Liquidation-end health** | The recovery target during liquidation | Init weights, oracle price |

By construction, init health ≤ liquidation-end health ≤ maintenance
health. The gap between init and maintenance is your safety buffer: you
can only *open* a position when init health is non-negative, but you're
only *liquidated* when maintenance health goes negative. That cushion
is yours to manage.

## What goes into health

**Collateral.** Each deposit contributes its value times an asset
weight; each borrow contributes negatively times a liability weight.
High-quality collateral is weighted near full value; volatile assets
are discounted. On init health, collateral is valued at the *lower* of
oracle and stable price and borrows at the *higher* — the conservative
band that resists oracle spikes. See
[Pricing & Mark Price](13-pricing-and-mark-price.md).

**Perp positions.** A position's contribution combines its base
exposure (valued at the oracle price, times a weight that depends on
whether you're long or short) and its quote balance (counted at face).
Open maker orders are counted at their worst-case fill price, so
resting orders never flatter your health. Positive perp PnL can be
capped before it's allowed to help your health elsewhere — a knob that
keeps a single market's unrealized gains from over-supporting the rest
of your account until you settle them.

## A simple intuition

Think of init health as "how much more could I lose and still be
allowed to have opened this?" and maintenance health as "how much more
could I lose before someone is allowed to close me out?" You want to
operate with both comfortably positive, and especially to keep a
margin above the maintenance line, because that's the one that triggers
liquidation.

## Leverage

There is no stepped leverage-tier table. Your effective leverage falls
out of the collateral and position weights: the closer the relevant
weight is to full value, the more notional your collateral supports.
For example, collateral weighted at full value backing a position whose
init weight leaves a 5% buffer supports roughly 20× that collateral in
notional — bounded, in practice, by the per-market parameters shown in
the app.

## Withdrawals

A withdrawal is allowed only if your init health stays non-negative
afterward — so the most you can withdraw is whatever brings init health
to exactly zero. The same gate applies to placing orders: an order that
would push you into negative init health is rejected.

## Watching your health

Subscribe to your account stream and set your own warning threshold —
for example, alert when init health drops below a small fraction of
your deposits — so you can add collateral or reduce before maintenance
health goes red. The app and API expose your health values and
per-position contributions directly, so you can see which position is
your weakest. See [API & SDK](27-api-and-sdk.md).
