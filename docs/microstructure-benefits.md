---
title: Microstructure Benefits
---

# Microstructure Benefits

[Home](index.md) | [Aims](aims.md) | [Architecture](architecture.md) |
[Microstructure](microstructure-benefits.md) | [Trust and Risk](trust-risk-failure.md)

Market microstructure is the set of rules that decides how orders become
trades. For an active perp venue, small details matter: who gets priority,
what information is visible, how quickly quotes update, and what happens
when systems fail.

Fermi-v1's microstructure is built around a first-come-first-served
execution queue and a price-time-priority order book.

## First-come-first-served sequencing

Each market has its own sequence. Orders that enter a market's queue are
processed in sequence order. This gives traders and market makers a
simple priority model: if your order has an earlier sequence in the same
market, it is ahead of later orders.

The benefit is predictability. Traders can audit where an order stood in
line, and market makers can quote with a clearer understanding of queue
position.

## Commit before reveal

The relayer first commits a hash of the order, then the executor reveals
the full payload later. The order's position is locked before its details
are public on chain.

This reduces payload-based reordering. A block producer or competing
trader should not be able to inspect an order's contents and then slip a
same-market order ahead of it, because the sequence is already committed.

## Price-time priority

The order book uses price-time priority. Better prices trade first. At
the same price, older orders trade first.

This is familiar to professional market participants and useful for
liquidity formation. Makers know that joining a level later puts them
behind earlier liquidity at that level, while improving price can move
them ahead.

## Deterministic matching

The matching path is deterministic. Given the same book, oracle inputs,
and queued intent, independent observers should derive the same result.

This matters because the Continuum harness can simulate accepted orders
before finality. Traders get quick feedback, while still being able to
reconcile against confirmed on-chain events.

## Lower adverse-selection risk for makers

Opaque or reorderable venues make makers widen spreads because they face
more uncertainty about whether their quotes will be picked off or jumped.
Fermi-v1 does not remove market risk, but it gives makers stronger
mechanical guarantees:

- Queue priority is visible.
- Same-market ordering is public after commit.
- Resting liquidity follows price-time rules.
- The matching engine emits events that can be reconciled.

Better confidence can translate into tighter spreads, deeper books, or
more durable quoting behavior.

## Better user experience without off-chain execution

Fast feedback usually comes from an off-chain matching engine. In
Fermi-v1, the fast feedback comes from optimistic reads over a
deterministic on-chain system. This gives users a CEX-like interaction
loop without making the off-chain layer the matching engine or final
authority.

## Per-market isolation

Each perp market has its own execution queue. Heavy activity or recovery
on one market does not require a single global queue for every market.
This helps throughput and keeps operational issues easier to diagnose.

## Censorship and liveness benefits

If the relayer refuses service, users can use the direct fallback path to
put intents on chain. If a queued item cannot execute, recovery logic can
advance the queue past expired or invalid items.

These mechanisms do not make latency problems impossible, but they avoid
the most damaging failure mode: an off-chain service becoming the
unchallengeable gatekeeper for market access.
