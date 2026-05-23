# Fermi-v1 Wiki

Fermi-v1 is a non-custodial perpetual futures exchange on Solana. It is
designed to combine the parts traders like about centralized exchanges
with the parts builders and users want from on-chain systems:

- Fast order acknowledgement and live market data.
- Transparent, auditable sequencing.
- Self-custody with on-chain order placement, matching, cancels, fills,
  margin, and liquidation.
- A familiar price-time-priority order book that lives in program state.
- A risk engine and event trail that can be inspected and reconciled
  against public state.

The core design choice is separation of execution from observation.
Execution is on chain: order placement, matching, book updates, cancels,
funding, risk checks, and liquidations all run through the deployed
program. Off-chain services sequence, submit, simulate, and distribute
state, but their simulation is non-binding.

## The one-page mental model

```
Trader / bot / UI
    signs an order intent
          |
          v
Relayer assigns a market sequence and commits a hash
          |
          v
On-chain execution queue locks ordering
          |
          v
Executor submits a reveal transaction
          |
          v
On-chain program verifies, matches, places/cancels, updates risk, and emits events
          |
          v
Continuum and fanout publish optimistic and confirmed views
```

The result is a market where the user experience can be fast while the
entire execution path remains on chain and verifiable.

## Who this wiki is for

This wiki is written for people trying to understand what Fermi-v1
achieves and how the pieces fit together:

- Traders evaluating execution quality and custody risk.
- Market makers evaluating queue priority and adverse-selection risk.
- Integrators planning a bot, UI, indexer, or risk monitor.
- Partners and reviewers evaluating the architecture at a system level.

The root documentation in the repository remains the technical reference.
This wiki stays one level higher: what the components do, why they exist,
and what properties they create.

## Core pages

- [Project Aims](Project-Aims)
- [System Architecture](Architecture)
- [Order Lifecycle](Order-Lifecycle)
- [Sequencer and Execution Queue](Sequencer-and-Execution-Queue)
- [Relayer and Executor](Relayer-and-Executor)
- [Optimistic Finality and Continuum](Optimistic-Finality-and-Continuum)
- [On-chain Execution, Margin, and Risk](On-chain-Execution-Margin-and-Risk)
- [Market Data and Integration Surfaces](Market-Data-and-Integration-Surfaces)
- [Microstructure Benefits](Microstructure-Benefits)
- [Trust, Risk, and Failure Modes](Trust-Risk-and-Failure-Modes)

## What Fermi-v1 is trying to prove

Many venues make users choose between speed and verifiability.
Centralized exchanges can be fast because the operator controls custody,
matching, and internal accounting. Fully on-chain venues can be
transparent, but interaction often feels slow because users wait for
block confirmation before seeing meaningful feedback.

Fermi-v1 tries to avoid that trade-off. The on-chain program is the
exchange engine: it owns the order book, runs matching, applies cancels,
updates positions, checks risk, and emits the authoritative events. The
off-chain services are acceleration and distribution layers. They can
help users submit, observe, and simulate orders quickly, but they cannot
execute trades off chain or rewrite the chain's final state.

## Short glossary

Intent: A signed order payload plus the accounts needed to execute it.

Relayer: The service that accepts signed intents, checks them, assigns a
market sequence, and commits their hashes to the queue.

Sequencer: The ordering role performed by the relayer and enforced by
the on-chain execution queue.

Execution queue: A per-market on-chain queue that locks first-come,
first-served order before matching.

Executor: The service that reveals committed intents and drives the
on-chain execution step.

Continuum harness: The off-chain read and simulation layer that serves a
non-binding optimistic view plus confirmed on-chain state.

Optimistic finality: The user-facing confidence that an accepted,
sequenced intent will execute as predicted, even before final on-chain
confirmation. The confidence comes from deterministic on-chain execution,
not from off-chain authority.
