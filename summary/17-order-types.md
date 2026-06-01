---
title: Order Types
description: Order types, matching behavior, and advanced controls
---

# Order Types

Every order carries a side, a size, optional caps, and a set of
modifiers. This page covers the order types and the controls you can
attach to them.

## Types

### Market

Crosses whatever the book offers, up to your size and spend caps, and
never posts the remainder. Pays the flat fee penalty on entry.

- **Use for:** an immediate exit or panic close.
- **Watch out:** a market order has no price ceiling beyond your spend
  cap. Always set a spend cap on production market orders so you can't
  fill into arbitrary depth.

### Immediate-or-cancel (IOC)

Crosses at any price as good as the limit you specify, and cancels the
remainder. Pays the fee penalty.

- **Use for:** aggressive limit hits and taker arbitrage where you
  want a price ceiling but no resting order left behind.

### Limit

A standard limit order at an absolute price. Crosses whatever is
marketable and posts the rest to the book. The post-side behavior is
selectable:

- **Limit** — cross what's crossable, post the remainder.
- **Post-only** — never cross; if any part would be marketable, the
  whole order is dropped. Use this to guarantee you're a maker.
- **Post-only-slide** — if it would cross, re-price one tick behind the
  best opposing price and post there. Always posts (when there's room).

### Oracle-pegged

Rests at an offset relative to the oracle price and re-prices itself as
the oracle moves, so you can quote around spot without cancel/replace
churn. You can set a hard limit price (a floor for bids, ceiling for
asks) beyond which it stops quoting, and a maximum oracle staleness
beyond which it won't match.

- **Use for:** passive market making that tracks spot.
- **Watch out:** if the oracle goes stale past your tolerance, the
  order becomes temporarily un-matchable. Set the staleness tolerance
  generously if you want to keep quoting through volatile conditions.

## Modifiers

**Time-in-force.** Seconds until the order auto-expires; zero means
good-till-cancel. Expiry is enforced lazily, so treat it as "expires
within" rather than "expires exactly at."

**Reduce-only.** Caps the order so it can only move your position
toward zero — it can never increase or flip it. Essential for
stop-loss bots that should never accidentally open new exposure. (A
market can also be globally reduce-only during a wind-down.)

**Self-trade behavior.** Controls what happens if your order would
match your own resting order. See
[Self-Trade Prevention](18-self-trade-prevention.md).

**Client order ID.** Your own tag, echoed on every fill, for
idempotent order management and lookups.

**Size and spend caps.** A base-size cap and an optional quote-spend
cap. Set both on market orders for safe execution.

## Quick reference

| Goal | Type | Modifier |
| --- | --- | --- |
| Hit the offer now, any depth | Market | set a spend cap |
| Hit up to a price | IOC at that price | — |
| Post a passive maker order | Limit | maker fee may be a rebate |
| Post, but drop if it would cross | Post-only | — |
| Post, sliding behind if it would cross | Post-only-slide | — |
| Track the oracle passively | Oracle-pegged | set a peg limit |
| Cancel if unfilled in N seconds | any | time-in-force = N |
| Close only, never flip | any | reduce-only |
