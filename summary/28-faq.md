---
title: FAQ
description: Common questions about execution, margin, and recovery
---

# FAQ

## Is Fermi custodial?

No. Fermi is non-custodial. Your collateral lives in an on-chain
account that only your signature (or a delegate you authorize) can
move. No operator or off-chain service can touch your funds.

## Who decides the order my trades execute in?

The [POSq sequencing layer](05-posq-sequencing-layer.md) assigns every
order its place in line, first-come-first-served. That place is locked
on chain before anyone can see your order's contents, so the ordering
is verifiable rather than something you have to trust. See
[FCFS Ordering](06-fcfs-ordering.md).

## How can it feel fast if it's fully on-chain?

An optimistic read layer predicts your fill the moment your order is
sequenced — typically in well under a second — while the on-chain
transaction reaches finality a beat later. The prediction holds
because the same deterministic matching logic runs in both places. See
[Fast Pre-Confirmations](07-fast-pre-confirmations.md).

## What can the off-chain services do to me?

Nothing that costs you. They can't move funds, change a fill, reorder
locked orders, edit your order, or replay it. The worst case is
degraded latency — and even then you can submit on chain directly. See
[Architecture](04-architecture.md) and
[Direct On-Chain Submission](25-direct-onchain-submission.md).

## What collateral can I use?

USDC is the settlement token; SOL, ETH, BTC and other listed tokens
are accepted as collateral at their respective weights. Everything is
cross-margin within an account. See [Collateral](10-collateral.md).

## How is my liquidation price determined?

You're liquidatable when your **maintenance health** goes negative,
using oracle prices and maintenance weights. Keep your init health
well above zero — the gap between init and maintenance is your buffer.
See [Margin & Account Health](20-margin-and-health.md) and
[Liquidations](22-liquidations.md).

## When is funding charged?

Continuously. There is no fixed funding hour — funding accrues over
time and settles into your position automatically whenever it's
touched. See [Funding](14-funding.md).

## Why did my market order fill less than expected?

Usually a spend cap or the matcher's scan limit was reached. Always
set a spend cap on market orders. See
[Order Types](17-order-types.md) and
[Matching Engine](16-matching-engine.md).

## Why isn't my maker rebate showing in my PnL yet?

Maker rebates are "in flight" until the corresponding fill event is
processed on chain. Don't book them as realized until confirmed. See
[Fees](19-fees.md).

## What happens if the oracle goes stale?

The affected market pauses — every health check that touches it fails
by design, because a stale price is unsafe to value. Anyone can refresh
the oracle, and other markets are unaffected. See
[Pricing & Mark Price](13-pricing-and-mark-price.md).

## Can I lose money from someone else's bankruptcy?

Only in an extreme, exchange-wide event, and only as a small
proportional haircut on depositors of the affected token, after the
liquidator-profit and insurance-fund layers are exhausted. Holding
collateral in a separate, perp-free sub-account minimizes even that.
See [Bankruptcy & Insurance Fund](23-bankruptcy-and-insurance.md).

## The fast path is down — how do I cancel an order?

Submit the cancel on chain directly. It carries a small speed-bump but
guarantees you can always pull risk off the book. See
[Direct On-Chain Submission](25-direct-onchain-submission.md).

## How do I run a bot without exposing my main keys?

Set a **delegate** — a hot wallet that can place and cancel orders,
settle PnL, and settle funding, but cannot withdraw or change
ownership. Your withdrawal keys stay cold. See
[Accounts](09-accounts.md).

## How do I debug what happened to an order?

Trace it by its market and sequence number. Every stage emits an event
with a reason. See [API & SDK](27-api-and-sdk.md).
