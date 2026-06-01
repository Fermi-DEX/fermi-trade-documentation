---
title: Architecture
description: How Fermi is built, and why it is both fair and fast
---

# Architecture

A perpetual-futures exchange has to do four things well:

1. **Match orders fairly** — earlier orders fill first, and nobody can
   jump the queue or front-run pending trades.
2. **Settle trustlessly** — you never hand custody of funds to an
   operator.
3. **Feel fast** — traders expect millisecond feedback, not block-time
   feedback.
4. **Stay live** — the exchange keeps working even when individual
   off-chain services fail.

On-chain order books usually get fairness and trustless settlement but
feel slow. Centralized exchanges feel fast but require you to trust the
operator's matching engine and custody. Fermi is architected so you
don't have to choose.

## The components

```
        Trader (wallet / SDK / UI / bot)
           │ sign + submit        ▲ read state / stream fills
           ▼                      │
   ┌───────────────┐      ┌──────────────────┐
   │ POSq           │      │ Optimistic read  │
   │ sequencing     │      │ layer            │
   │ layer          │      │ (Continuum)      │
   └──────┬─────────┘      └────────▲─────────┘
          │ ordered intents          │ on-chain reads
          ▼                          │
   ┌──────────────────────────────────────────────┐
   │   Fermi on-chain settlement program            │
   │   execution queue → matching → risk engine     │
   │   (the single source of truth)                 │
   └──────────────────────────────────────────────┘
                   Solana mainnet-beta
```

### The on-chain settlement program

This is the **only authority**. It owns the execution queue, the
price-time-priority order book, the cross-margin risk engine, funding,
liquidation, and all value-bearing state. Every fill, every funding
payment, every liquidation happens here, recorded on the public
ledger. Nothing off-chain can move your funds, change a fill, or
reorder a trade.

This is the bedrock of the trust model: if every off-chain component
disappeared tomorrow, your funds would be exactly where the chain says
they are, and you could still interact with the program directly.

### The POSq sequencing layer

Fairness on Fermi rests on the **POSq sequencing layer**. POSq is
responsible for two things:

- **Fair ordering.** It assigns every incoming order a place in a
  single, monotonically increasing, gap-free sequence per market.
  Orders execute in that order, period.
- **Censorship resistance.** It is responsible for getting your order
  into the queue, so that no single party can quietly drop or delay
  your flow.

Crucially, the order POSq assigns is **locked on chain before anyone
can see what your order contains** (see
[FCFS Ordering](06-fcfs-ordering.md)). That is what turns "fair
ordering" from a promise into a property you can verify.

The POSq layer is documented in detail on its own page —
[POSq Sequencing Layer](05-posq-sequencing-layer.md).

### The optimistic read layer

The optimistic read layer (the "Continuum" harness) is what makes
Fermi *feel* fast. It maintains a continuously-updated mirror of all
on-chain state and serves it over HTTP and streaming. It publishes two
views:

- **Confirmed view** — derived purely from finalized on-chain
  transactions. This is ground truth.
- **Optimistic view** — the confirmed view plus the orders that have
  already been sequenced but not yet finalized. Because the matching
  logic is deterministic, the optimistic view can predict your fill
  *before the block lands*.

A fan-out service re-broadcasts the event stream to many subscribers
at once. Like everything else off-chain, the read layer has **no
authority** — it can read and predict state, but the program only ever
honors signed, sequenced, executed orders. A wrong read can mislead a
screen for a moment; it can never change what the chain does.

## How a trade flows

```
t0   You sign an order and submit it.
t0+  POSq assigns it sequence N and locks that position on chain.
     → The read layer predicts the fill; your screen updates in
       well under a second.
t1   The order is revealed and dispatched into the matching engine
     on chain; the fill is written; the queue advances.
t2   The fill reaches finality. The confirmed view now matches the
     pre-confirmation you already saw.
```

You experience `t0+` — milliseconds. The chain reaches finality at
`t2` — a second or two later. The gap is bridged by the optimistic
view, and it is *safe* to bridge because the prediction is made by the
same deterministic matcher the chain will run.

## The trust model, stated plainly

The single most important question is "what can each party do to me?"

| Party | Can do | Cannot do |
| --- | --- | --- |
| On-chain program | Everything — it is the authority, fixed by deployed, audited code. | Act outside its code. Upgrades are governance-gated. |
| POSq sequencing layer | Assign and publish the order of intents; ensure inclusion. | Alter your order, reorder it after it is locked, replay it, or touch your funds. |
| Optimistic read layer | Read and predict state; serve it fast. | Change any state, or force the program to honor a prediction. |
| Another trader / validator | Submit their own orders; build blocks. | See your order's contents before it is sequenced; reorder same-market intents; front-run locked flow. |
| You | Sign and submit your own orders; withdraw your own funds; liquidate underwater accounts. | Affect anyone else's account without their signature. |

Every off-chain component is **unprivileged**. The headline pairing is
fair ordering from POSq plus centralized-exchange-like responsiveness
from a read layer that has nothing to betray you *with*.

## What happens when things fail

No single off-chain failure can cause loss of funds or loss of fair
ordering. The worst case is degraded latency, or a temporary inability
to enter new orders via the fastest path — and even then a
permissionless [on-chain submission path](25-direct-onchain-submission.md)
remains open. Per-market isolation means a problem in one market does
not stall the others, and a stale oracle pauses only the affected
market until anyone refreshes it.

## Where to read more

- [FCFS Ordering](06-fcfs-ordering.md) — how fair ordering is enforced
  and verified on chain.
- [Fast Pre-Confirmations](07-fast-pre-confirmations.md) — how the
  optimistic view delivers sub-second feedback safely.
- [Matching Engine](16-matching-engine.md) and
  [Order Book](15-order-book.md) — how fills are produced.
- [Margin & Account Health](20-margin-and-health.md) — the cross-margin
  risk engine.
