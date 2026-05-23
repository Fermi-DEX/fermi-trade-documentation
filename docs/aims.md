---
title: Project Aims
---

# Project Aims

[Home](index.md) | [Aims](aims.md) | [Architecture](architecture.md) |
[Microstructure](microstructure-benefits.md) | [Trust and Risk](trust-risk-failure.md)

Fermi-v1 is designed to make a high-performance perpetual futures market
without moving the market's authority off chain.

The aim is not only to make another order book. The aim is to show that a
perp venue can be:

- Fast enough for active traders.
- Transparent enough for independent verification of execution.
- Self-custodial enough that users do not depend on an exchange balance
  sheet.
- Structured enough for market makers to quote with confidence.
- Resilient enough that off-chain services can fail without rewriting the
  order book, fills, or account history.

## Why this matters

A perp exchange needs four properties at the same time:

1. Fair ordering. Earlier orders should not be jumped after their content
   is known.
2. Trustless execution. Placement, cancel, match, fill, margin change,
   funding payment, or liquidation should be performed by public code.
3. Low-latency feedback. Traders need to know quickly whether an order
   was accepted, sequenced, filled, posted, or rejected.
4. Liveness. A single server should not be able to freeze the whole
   market.

Traditional centralized exchanges usually solve latency, but users must
trust custody and matching. Naive on-chain order books solve custody and
transparency, but latency and ordering can be poor. Fermi-v1 separates
authority from convenience so the speed layer can help users without
owning the market.

## Design principles

### Keep authority on chain

The Solana program owns the value-bearing state: collateral, positions,
order books, funding, fees, liquidation, and bankruptcy handling.
Off-chain services cannot move funds or create fills by themselves.

### Make sequencing visible

Orders go through a per-market execution queue. The queue gives each
market a public sequence, so users can reason about order priority by
market and sequence number instead of trusting an invisible matching
server.

### Separate prediction from execution

The Continuum harness can predict what an accepted order should do
against a mirrored book. That prediction is useful for user experience,
but the actual placement, cancel, match, fill, and risk update still come
from the on-chain program.

### Prefer mechanical fairness

Fermi-v1 aims for rules that can be checked by code: commit before
reveal, price-time priority, replay protection, explicit risk checks, and
event trails. Fairness should be a property of the mechanism, not only a
promise made by the operator.

## Who benefits

Traders get self-custody, quick feedback, and an auditable order path.

Market makers get deterministic queue priority, familiar order-book
microstructure, and better confidence that quotes cannot be rearranged
after submission.

Integrators get APIs and streams for trading workflows while still being
able to reconcile execution against on-chain state.

Liquidators get public health rules and permissionless liquidation paths.

Evaluators get a clearer trust boundary: the operator can run useful
services, but those services do not become the exchange's source of
truth.
