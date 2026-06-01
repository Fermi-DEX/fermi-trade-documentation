---
title: Pricing & Mark Price
description: Oracle price, stable price, and which price is used where
---

# Pricing & Mark Price

Three prices matter on Fermi, and which one applies depends on what is
being computed.

1. **Oracle price** — the spot reference, sourced from established
   oracle providers. Used for unrealized PnL and for maintenance
   health.
2. **Stable price** — a slow, spike-resistant filter on the oracle.
   Used to widen the safety band when you open new exposure.
3. **Book impact price** — derived from the order book. Used to compute
   the funding rate.

There is no separate "mark price" object on Fermi. The mark depends on
the computation:

| Computation | Price used |
| --- | --- |
| Unrealized PnL | Oracle price |
| Maintenance health (liquidation trigger) | Oracle price |
| Init health — collateral side | The lower of oracle and stable price |
| Init health — borrow side | The higher of oracle and stable price |
| Funding rate | Book impact price vs. oracle price |
| Liquidation pricing | Oracle price, adjusted by the liquidation fee |

## Oracle confidence and staleness

Every oracle read is checked for confidence (the price's uncertainty
must be within a configured fraction of the price) and freshness (the
update must be recent enough). If either check fails, the instruction
reverts. There is no "use the last good price" fallback — a stale or
noisy oracle simply pauses trading on that market until it is
refreshed, which anyone can do. This is intentional: an unsafe price
is treated as no price.

## The stable price and why it exists

The stable price tracks the oracle on calm markets but refuses to
follow short-term spikes, catching up only over minutes and hours
rather than seconds. Init health uses the *wider* band — assets valued
at the lower of oracle and stable, liabilities at the higher — which
produces two protections:

- A flash crash in the oracle can't let you over-borrow against
  collateral; the stable price restrains your borrowing power until it
  catches up.
- A flash pump can't artificially inflate the health of a short; you
  still owe at the more conservative price.

This band is the single biggest reason init health is strictly tighter
than maintenance health, and it is a core defense against oracle
manipulation.

## Mark price for unrealized PnL

Your unrealized PnL is always marked to the **oracle** price — this is
the "uPnL" figure you see in the app. The stable price is used only by
init health, never by PnL.

## Mark price during liquidation

When a liquidator reduces your position, the transfer happens at the
oracle price adjusted by the liquidation fee — slightly unfavorable to
the account being liquidated, which is what gives the liquidator their
incentive. See [Liquidations](22-liquidations.md).
