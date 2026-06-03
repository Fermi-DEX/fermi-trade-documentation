---
title: Direct On-Chain Submission
description: The permissionless path that backstops inclusion
---

# Direct On-Chain Submission

The fast path on Fermi runs through the
[POSq sequencing layer](05-posq-sequencing-layer.md). In v1, POSq uses a
single sequencer that orders encrypted transactions over VDF ticks. That
makes reordering detectable, but it does not eliminate every
availability or pre-admission censorship risk. As a backstop, Fermi also
exposes a **permissionless on-chain submission path**: any signer can
push an order straight into a market's queue on chain, without depending
on the fast path at all.

This is the floor under the system's censorship resistance in v1: as
long as you can land a Solana transaction, you can always reach the
exchange even if the fast path is unavailable or refusing admission.

## When to use it

- **You need to act and the fast path is unavailable.** For example,
  you want to cancel a resting order or close a position and can't
  reach the fast path. Cancellations in particular are the most common
  reason to use it.
- **You want maximum self-reliance.** If you'd rather not depend on any
  off-chain service for a given action, submit it on chain yourself.
- **You're integrating from another program.** A Solana program can
  place a Fermi order on chain directly. See [API & SDK](27-api-and-sdk.md).

## When not to use it

- **Latency-sensitive trading.** The direct path carries a deliberate
  speed-bump — a fixed delay before the order can execute — so it is
  slower than the fast path. It exists for resilience, not for racing.
- **Routine flow.** The fast path is cheaper and handles retries,
  optimistic feedback, and batching for you.

## How it works

You submit a transaction containing your signed order, the full list
of accounts it will touch, and a proof that you signed the order. The
on-chain program verifies your signature, records the order, and — after
the speed-bump — promotes it into the market's queue, where it then
follows the same verify-and-execute path as any other order. The
speed-bump deters spam and gives the fast path a chance to include the
order first if you'd prefer that.

## What it does *not* bypass

The direct path is a different *route in*, not a way around the rules:

- **It does not bypass health checks.** Your order still has to be
  valid at execution. If your account is liquidatable, a direct-
  submitted order to increase exposure still fails.
- **It does not bypass replay protection.** A given signed order can
  still only be consumed once; retries need a fresh order.
- **It does not change execution.** Everything executes through the
  same on-chain program, with the same guarantees.

## Recommended use: cancel under stress

The most common production use is cancelling a resting order when you
can't reach the fast path and the market is moving. Build the cancel,
sign it, and submit it on chain directly. It's the safety valve that
ensures you can always pull risk off the book.
