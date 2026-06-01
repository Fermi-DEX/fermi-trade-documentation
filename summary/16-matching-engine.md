---
title: Matching Engine
description: What happens to your order once it is dispatched
---

# Matching Engine

Once an order has been sequenced and revealed, the on-chain matching
engine runs. This page traces what happens to your order, in order.

## The pipeline

1. **Entry fee (market/IOC only).** A market or immediate-or-cancel
   order pays a flat fee penalty up front, whether or not it fills.
   This prices in the cost of running the match and discourages spam.
2. **Walk the opposing book.** The engine repeatedly pulls the best
   opposing order — comparing fixed-price and oracle-pegged liquidity
   and taking whichever is better priced — and checks whether it is
   compatible with your order's price. If it isn't, matching stops.
3. **Check expiry and validity.** Expired resting orders are removed
   along the way; oracle-pegged orders outside their limit this tick
   are skipped (not removed — they may be valid again next tick).
4. **Handle self-trades.** If you'd match your own resting order, the
   configured behavior applies. See
   [Self-Trade Prevention](18-self-trade-prevention.md).
5. **Fill.** A fill is recorded with maker, taker, price, size, and
   fees, and your remaining size is reduced accordingly.
6. **Post the remainder.** Whatever is left behind depends on the
   order type (below).

## Posting behavior by order type

- **Market / IOC** orders never post — any unfilled remainder is
  cancelled.
- **Limit** orders post the remainder to the book.
- **Post-only** orders only post if they didn't cross at all; if any
  of the order would have been marketable, the whole order is dropped
  (no fill, no rest).
- **Post-only-slide** orders that would have crossed are re-priced one
  tick behind the best opposing price and posted there.
- **Oracle-pegged limit** orders post the remainder as a pegged
  resting order.

See [Order Types](17-order-types.md) for the full set and when to use
each.

## Limits that shape your fill

A single match pass is bounded so it cannot consume unlimited compute:
it stops when your order is filled, hits its price limit, exhausts its
spend cap, or reaches a cap on how many opposing orders it scans. If a
fill comes back smaller than you expected, one of these limits — most
often a spend cap or the scan limit — is usually why.

## Taker now, maker shortly after

The taker side of a fill is updated immediately. The maker side is
settled a moment later when the fill event is processed: the fill is
publicly visible right away, but the maker's balance and any rebate are
applied on event consumption. This is why you should not book maker
rebates as realized PnL until the corresponding event is confirmed —
see [Fast Pre-Confirmations](07-fast-pre-confirmations.md).

## Receipts

Every match emits structured events — taker logs, per-fill logs, and
removal events for any orders pulled off the book. These are the
canonical receipts for accounting and are re-broadcast in real time
over the event stream. If you ever need to know exactly what happened
to a specific order, trace it by its market and sequence number.

## Common outcomes

| You see | Why |
| --- | --- |
| Nothing posted, nothing filled | A post-only order would have crossed, or it filled completely before reaching the post step. |
| Smaller fill than expected | A scan or spend-cap limit was reached. |
| Order disappeared | Its time-in-force expired. |
| Your resting order was pushed out | The book side was full and a higher-priority order evicted it. |
