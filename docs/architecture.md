---
title: Architecture
---

# Architecture

[Home](index.md) | [Aims](aims.md) | [Architecture](architecture.md) |
[Microstructure](microstructure-benefits.md) | [Trust and Risk](trust-risk-failure.md)

Fermi-v1 has four main parts. Each part has a narrow job, and only one of
them has authority over funds or market state.

```
Trader / SDK / UI / bot
        |
        | signed order intent
        v
Relayer --------------> Continuum harness / fanout
        |                         ^
        | commit hash             | reads and streams state
        v                         |
On-chain Fermi-v1 program <-------+
        ^
        | reveal and execute
        |
Executor
```

## On-chain settlement program

The Solana program is the source of truth. It owns:

- Collateral accounts and balances.
- Perp markets and order books.
- Matching and event queues.
- Cross-margin health calculations.
- Funding, fees, liquidation, insurance, and bankruptcy logic.
- The execution queue that orders pending intents before they touch the
  book.

Every value-changing action has to pass through this program. This is
what makes the venue non-custodial: the off-chain system can help submit
and observe transactions, but it cannot settle outside the program.

## Relayer

The relayer receives signed order intents from users. It validates them
off chain, assigns a per-market sequence, and commits a hash of each
intent to the on-chain execution queue.

The relayer improves latency and batching efficiency, but it is not a
custodian and not the final matcher. Once an intent hash and sequence are
committed, the relayer cannot change the order contents without failing
the reveal check.

## Executor

The executor takes committed queue items and reveals the full payloads to
the on-chain program. The program recomputes the hash, checks the user
signature, checks replay protection, and dispatches the order into the
matching engine.

The executor is a crank. It drives progress, but it cannot invent a fill
or change the signed order. If execution stalls, recovery paths let the
queue advance past expired or invalid items.

## Continuum harness and fanout

The Continuum harness is the fast read layer. It mirrors on-chain state
and can also show an optimistic view that includes accepted intents that
have not finalized yet.

The fanout service distributes events to many users and bots. It is a
scaling layer, not a source of truth.

## Order lifecycle

1. A trader signs an intent that includes the order and required account
   list.
2. The relayer validates the intent and assigns a sequence for that
   market.
3. The relayer commits the intent hash to the on-chain execution queue.
4. The harness can show the accepted order in an optimistic view.
5. The executor reveals the payload for the queued sequence.
6. The on-chain program checks hash, signature, replay status, and risk.
7. The matching engine fills, posts, cancels, or rejects the order.
8. Events are emitted and streamed to users.
9. Confirmed state catches up with the earlier optimistic view.

## Why the split works

The architecture gives each concern its own place:

- Authority lives on chain.
- Sequencing is public and per market.
- Latency is handled by off-chain services.
- Observability is handled by streams and traceable events.
- Recovery is explicit instead of hidden inside an operator database.

The important point is that convenience does not become custody. The
off-chain components can improve the trading experience, but the market's
rules are enforced by the on-chain program.
