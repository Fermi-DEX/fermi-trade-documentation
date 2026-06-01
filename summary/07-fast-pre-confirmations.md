---
title: Fast Pre-Confirmations
description: How Fermi delivers sub-second feedback while staying fully on-chain
---

# Fast Pre-Confirmations

On most on-chain order books, every action waits for block
confirmation before you know what happened. Fermi removes that wait
with **pre-confirmations**: the moment your order is sequenced, you
see your predicted fill — typically in well under a second — while the
on-chain transaction reaches finality a beat behind.

## Two views of the same state

The optimistic read layer maintains a live mirror of all on-chain
state and publishes two views:

- **Confirmed view.** Built only from finalized on-chain transactions.
  This is ground truth — what you reconcile and settle against.
- **Optimistic view.** The confirmed view *plus* the orders that have
  already been sequenced but not yet finalized.

A pre-confirmation is a reading from the optimistic view. For example:
*"Your order is sequenced at position N and, against the current book,
fills 1.4 SOL at $150.2."*

## Why the prediction holds

A pre-confirmation is not a guess. The matching logic is
**deterministic**, and the read layer runs the same logic against its
mirror of the book that the chain will run when the order executes.
Because the order's place in line is already locked
([FCFS Ordering](06-fcfs-ordering.md)), the prediction and the
on-chain result agree.

The one source of drift is genuinely external: oracle-pegged orders
re-price as the oracle moves, so a prediction made against one oracle
reading can differ slightly if the oracle moves before execution.
Fixed-price liquidity does not have this caveat.

## What you should and shouldn't rely on

- **Do** use the optimistic view to drive a responsive UI, to make
  trading decisions, and to react in real time.
- **Do** reconcile final balances, realized PnL, and accounting
  against the **confirmed** view. Maker rebates in particular are only
  final once the corresponding on-chain event is consumed; don't book
  them as realized until then.
- **Remember** the read layer has no authority. If it ever disagrees
  with the chain, the chain wins. You can always read confirmed state
  directly from any Solana RPC.

## Scaling and resilience

A fan-out service sits in front of the event stream and re-broadcasts
it to many subscribers at once, so thousands of traders and bots can
stream fills without overloading the core read layer. If the read
layer or fan-out degrades, trading itself is unaffected — you fall
back to reading confirmed state directly from the chain.

## Related

- [Architecture](04-architecture.md) — where the read layer sits in the
  system.
- [API & SDK](27-api-and-sdk.md) — how to subscribe to optimistic and
  confirmed streams.
