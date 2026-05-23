---
title: Fermi-v1 Project Guide
---

# Fermi-v1

[Home](index.md) | [Aims](aims.md) | [Architecture](architecture.md) |
[Microstructure](microstructure-benefits.md) | [Trust and Risk](trust-risk-failure.md)

Fermi-v1 is a non-custodial perpetual futures exchange on Solana. It
keeps custody, order placement, cancels, matching, margin, funding, and
liquidation on chain, while using off-chain services only to make the
system fast to submit to and easy to observe.

The project is built around a simple split:

- The Solana program is the source of truth for execution.
- The relayer sequences signed orders into a public queue.
- The executor submits reveal transactions that trigger on-chain
  execution.
- The Continuum harness gives traders a low-latency, non-binding
  simulation of what is about to happen on chain.

This site is the abstract guide. It is meant for humans who need the
project's shape before reading formulas, account layouts, or API
references.

## Start here

- [Project Aims](aims.md) explains what Fermi-v1 is trying to prove.
- [Architecture](architecture.md) describes the system components and
  how an order moves through them.
- [Microstructure Benefits](microstructure-benefits.md) explains why the
  queue and order book design matter for traders and market makers.
- [Trust, Risk, and Failure Modes](trust-risk-failure.md) explains what
  each component can and cannot do.

## The short version

Most crypto derivatives venues force a trade-off. Centralized exchanges
feel fast, but users trust an operator with custody and matching. Fully
on-chain venues are transparent and self-custodial, but often feel slow
because every interaction waits for block confirmation.

Fermi-v1 tries to keep the useful parts of both models:

- Self-custody, matching, cancels, fills, and risk checks are enforced by
  deployed on-chain code.
- Same-market ordering is first-come-first-served through a public
  commit/reveal queue.
- The order book is price-time priority, not an opaque auction.
- Optimistic reads let users see accepted orders and predicted fills
  quickly, before finality catches up.
- The direct fallback path keeps users from depending completely on a
  relayer.

## Reference manual

The full technical reference remains in the repository root:

- [Overview](https://github.com/Fermi-DEX/fermi-trade-documentation/blob/main/01-overview.md)
- [Architecture](https://github.com/Fermi-DEX/fermi-trade-documentation/blob/main/02-architecture.md)
- [FIFO Order Book](https://github.com/Fermi-DEX/fermi-trade-documentation/blob/main/10-fifo-orderbook.md)
- [Matching Engine](https://github.com/Fermi-DEX/fermi-trade-documentation/blob/main/11-matching-engine.md)
- [Execution Queue v5](https://github.com/Fermi-DEX/fermi-trade-documentation/blob/main/20-execution-queue.md)
- [SDK and APIs](https://github.com/Fermi-DEX/fermi-trade-documentation/blob/main/23-sdk.md)

## Enabling GitHub Pages

In the repository settings, set GitHub Pages to build from the `main`
branch and the `/docs` folder. GitHub will serve this site from the
repository's Pages URL.
