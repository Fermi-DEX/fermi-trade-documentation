---
title: Order Book
description: Price-time priority and how the book behaves
---

# Order Book

Fermi runs a strict **price-time-priority** order book on chain. Every
market has a bids side and an asks side, and within each side orders
are ranked first by price, then by the time they arrived.

## Two kinds of resting liquidity

Each side of the book holds two interleaved sets of orders:

- **Fixed-price orders** rest at an absolute price you set.
- **Oracle-pegged orders** rest at an offset relative to the oracle
  price, and re-price automatically as the oracle moves. This lets a
  market maker keep quotes tracking spot without constantly cancelling
  and replacing them.

When the matching engine needs the next order, it compares the best
fixed-price order and the current effective price of the best
oracle-pegged order, and takes whichever is better. Pegged orders can
carry a hard limit price, so they simply stop quoting if the oracle
moves past a bound (and resume when it comes back).

## Price-time priority

For asks, the cheapest offer is matched first; for bids, the highest
bid is matched first. When two orders sit at the same price, the one
that arrived earlier is filled first. This is the same fairness model a
professional venue uses — and on Fermi the time priority is anchored to
the [POSq sequence](../30-posq-sequencing.md) and on-chain queue. In v1,
POSq orders encrypted transactions over VDF ticks, so reordering is
detectable rather than operator-hidden.

## Order identity and cancellation

Every resting order has an on-chain order ID. You can cancel by that
ID, by your own client-supplied order ID, by side, or all at once.
Cancellation can go through the fast path, or — if you ever need it —
directly on chain. See
[Direct On-Chain Submission](25-direct-onchain-submission.md).

## Expiry and housekeeping

Orders can carry a **time-in-force**, after which they are treated as
expired. Expiry is enforced lazily — an expired order is removed the
next time the matcher encounters it, or by routine event processing —
so you should treat time-in-force as "expires within" rather than
"expires exactly at."

## Capacity and eviction

The book has a large but bounded capacity per side. If a side is full
and a new order needs to post, the worst-priced existing order is
evicted to make room. In practice the active markets rarely approach
the limit, and the more common constraint is the number of open-order
slots on your own account — see [Accounts](09-accounts.md). The
takeaway for makers: don't park a deep stack of far-from-market orders
and assume they'll persist on a busy book.

## Determinism

Because price-time priority is fully encoded in each order's on-chain
ranking, any two observers replaying the same event stream arrive at
the same book. This determinism is what lets the optimistic read layer
predict fills exactly — see
[Fast Pre-Confirmations](07-fast-pre-confirmations.md).
