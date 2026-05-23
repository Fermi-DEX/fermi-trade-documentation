# 01 · Overview

Fermi-v1 is a **non-custodial, fully on-chain perpetual-futures exchange**
on Solana. Traders self-custody collateral and sign their own orders;
order placement, cancels, matching, fills, risk checks, funding, and
liquidation all execute through the deployed program. There is no
off-chain matching engine, no off-chain risk database, no escrow account.

Fermi-v1 is built around four cleanly separated components:

1. The **on-chain exchange program** — a Solana program that owns
   order placement, cancels, the order book, the matching engine, the
   risk engine, funding, and liquidation. It is the single source of
   truth for execution.
2. A **per-market commit/reveal execution queue** (the v5 queue)
   built into that program, which sequences every order
   first-come-first-served before it touches the book.
3. The **relayer** — an off-chain sequencer that accepts signed
   orders, validates them, and commits them to the queue.
4. The **Continuum harness** — an off-chain read layer that
   publishes optimistic and confirmed state to traders over
   HTTP / SSE, so they see their orders reflected in milliseconds
   while on-chain finality follows behind.

See [02 - Architecture](02-architecture.md) for how these pieces fit
together and why the design is both fast and fair.

## What you get

- **Cross-collateral perps.** Spot deposits (USDC, SOL, ETH, BTC, …)
  back perp positions across all markets in the group. Health is a
  single signed-USD number.
- **FIFO orderbook.** Two trees per side — fixed price and oracle-
  pegged — both ordered strictly by price-time.
- **Verifiable order sequencing.** Every order is hash-committed on
  chain *before* it executes. Validators cannot reorder same-market
  orders without breaking the commit hash.
- **Replay protection.** A 10-slot, 512-entry intent-hash cache makes
  signature replay impossible.
- **Censorship fallback.** A direct-submission pool lets users get
  orders into the queue even if the relayer is offline or hostile.
- **Public, low-latency reads.** The Continuum harness exposes
  optimistic order-book and account state over SSE; the fanout service
  scales it horizontally.

## The stack at a glance

```
                ┌─────────────────────────────────────────────┐
                │             Wallet / SDK / UI               │
                └────┬─────────────────────┬─────────────┬────┘
       sign+submit   │  read state         │  read events│
                     ▼                     ▼             ▼
            ┌────────────────┐  ┌─────────────────┐ ┌──────────┐
            │   Relayer      │  │   Continuum     │ │ Fanout   │
            │   (gRPC :9090) │  │   harness       │ │ (SSE)    │
            │                │  │  (HTTP/SSE)     │ │          │
            └────────┬───────┘  └────────┬────────┘ └─────┬────┘
                     │                   ▲                ▲
            commit + reveal              │ on-chain reads │
                     ▼                   │                │
            ┌────────────────────────────┴────────────────┴────┐
            │       Fermi-v1 on-chain exchange program          │
            │                                                   │
            │  Group · Bank · FermiAccount · PerpMarket         │
            │  BookSide · EventQueue · ExecutionQueueV5         │
            └───────────────────────────────────────────────────┘
                                Solana mainnet-beta
```

A trade lives the following lifecycle:

1. **Sign**: SDK builds a v5-canonical intent payload and the user
   signs it (wallet pop-up or programmatic Ed25519 signature).
2. **Submit**: SDK sends the intent to the relayer over gRPC.
3. **Pre-validate**: relayer checks signature, account staleness,
   oracle freshness, health, and reduce-only rules off-chain.
4. **Commit**: relayer batches up to 64 commits and writes them to
   the per-market `ExecutionQueueV5` ring.
5. **Reveal & execute**: in a later transaction, the executor
   reveals the payload; the program re-hashes it, verifies the user
   signature, runs the order through the on-chain Fermi handler, and
   advances the queue head.
6. **Stream**: the executor emits a `FillLogV3` (or `OutEvent`); the
   fanout service propagates it over SSE.
7. **Settle / fund**: PnL is settled by anyone calling
   `perp_settle_pnl`; funding accrues continuously and is paid at
   `perp_update_funding`.

## What is *not* off-chain

Order placement, cancels, the matching engine, risk engine, liquidator,
oracle checks, fee accrual, funding accrual, PnL settlement, and
bankruptcy resolution are all in the on-chain program. The relayer's job
is **sequencing and pre-flight validation only**. Continuum's optimistic
view is **non-binding simulation only**. If the relayer drops your
intent, the chain state is unaffected; if the relayer reorders your
intent, the commit hash mismatch is caught and the offending tx is
rejected.

## Properties at a glance

| Property | Mechanism |
|---|---|
| Self-custody | Fermi account is a PDA you own; only your signature can mutate it. |
| Verifiable ordering | Per-market sequence + hash commit prior to reveal. |
| Replay-proof | On-chain `replay_cache` of consumed intent hashes (10 slots / 512 entries). |
| FIFO matching | Composite `(price, !seq)` keys for bids and `(price, seq)` for asks. |
| Censorship fallback | Direct-submit pool with a fixed slot speed-bump. |
| Margin safety | Three weighted health values: `init`, `maint`, `liquidation_end`. |
| Liquidation liveness | Anyone can liquidate; insurance fund + socialization tail. |
| Oracle attack resistance | Init health uses a stable price band; oracles checked for staleness and confidence. |
| Operational visibility | Every stage of an intent emits a structured event; trace by `(market, seq)`. |

## Where to next

- **Investor / evaluator?** Read [02 - Architecture](02-architecture.md)
  for the system design, trust model, and viability case.
- **Trader?** Start with [03 - Getting Started](03-getting-started.md)
  → [12 - Order Types](12-order-types.md) → [15 - Margin & Health](15-margin-and-health.md).
- **Bot author?** Read [22 - Trader Workflow](22-trader-workflow.md) and
  [26 - gRPC API](26-api-grpc.md).
- **Liquidator?** [17 - Liquidation](17-liquidation.md) is the canonical
  reference; pair it with [18 - Bankruptcy](18-bankruptcy-insurance.md).
- **Protocol integrator (CPI)?** [24 - Direct CPI](24-direct-cpi.md)
  shows the on-chain instruction shape and required preinstructions.
