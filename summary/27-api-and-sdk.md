---
title: API & SDK
description: Programmatic access — clients, submission, reads, and streams
---

# API & SDK

Fermi exposes everything a UI, bot, or integrator needs:
client libraries for building and signing orders, a submission
interface, read endpoints for state, and streams for real-time
events. This page is a high-level map; the full endpoint and method
reference is published with each release.

## Client libraries

Official clients are available in **TypeScript** and **Rust**. They
handle the parts you don't want to reimplement:

- Building canonical order payloads and signing them.
- Submitting to the fast path and tracking the assigned sequence.
- Reading account, market, and book state.
- Computing account health and likely fills locally.
- Building cancels and the [on-chain submission path](25-direct-onchain-submission.md)
  for resilience.

A typical flow is: build an order intent, sign it with the owner (or a
delegate) key, submit it, and watch for the pre-confirmation and then
the confirmed fill.

## Submission

Orders are submitted as **signed intents**: the order payload, your
signature, and the exact list of accounts the order will touch. The
signature and account list are bound into the intent, so neither can
be altered after you sign. Submission returns the assigned sequence
and a transaction reference immediately, so you can track the order
through to finality. See [Trader Workflow](26-trader-workflow.md).

## Reads

State is available over HTTP from the optimistic read layer in two
forms:

- **Confirmed** — derived from finalized on-chain transactions
  (ground truth for accounting).
- **Optimistic** — confirmed plus accepted-but-not-yet-final orders
  (for responsiveness).

You can also read confirmed state directly from any Solana RPC if you
prefer not to depend on the read layer. Common reads include market
and book snapshots, your account state and health, candles, and
historical trades, funding, and PnL.

## Streams

Real-time events are delivered over a streaming interface, with a
fan-out service that scales to many subscribers at once. Typical
subscriptions:

- **Fills** and order lifecycle events for your account.
- **Book deltas** for the markets you trade.
- **Funding** updates per market.
- **Liquidation and bankruptcy** events.

Streams carry the same structured events used for accounting, so you
can reconstruct state from a given point by replaying events.

## Tracing

Every stage of an order's life emits an event. Given a market and a
sequence number, you can query the full trail — accepted, locked,
revealed, executed, or skipped, each with a reason. This is the
canonical way to answer "what happened to my order?"

## Integrating from another program

A Solana program can place a Fermi order on chain directly via
cross-program invocation, using the same signed-intent and account-
list model. This is the right path for protocol integrations that
shouldn't depend on any off-chain service. See
[Direct On-Chain Submission](25-direct-onchain-submission.md).

## Endpoints and addresses

Program IDs, market and queue addresses, RPC and stream URLs, and the
full method/endpoint reference are published per network (mainnet and
development) alongside each release. Always pull the current values
from the published reference rather than hard-coding them.
