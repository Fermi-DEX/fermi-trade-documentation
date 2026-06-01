---
title: First-Come-First-Served Ordering
description: How Fermi makes fair ordering a verifiable property, not a promise
---

# First-Come-First-Served Ordering

Fermi's defining property is **first-come-first-served (FCFS)
ordering**: earlier orders execute before later ones, and nobody — not
an operator, not a validator, not another trader — can jump the line
or front-run pending flow.

The order in which trades happen is decided by the
[POSq sequencing layer](05-posq-sequencing-layer.md). What this page
explains is how that order is *enforced and verified on chain*, so
that FCFS is something you can check rather than something you have to
trust.

## One sequence per market

Each market has a single, monotonically increasing, gap-free sequence.
Every order is assigned the next number in that sequence and executes
in that order. There is no parallel "fast lane" that can slip ahead.
Because the markets are independent, they sequence and execute in
parallel with one another — fairness within a market, throughput
across markets.

## Lock first, open later: commit / reveal

The key mechanism is a two-step **commit / reveal** protocol:

1. **Commit.** When your order is sequenced, only a *hash* of its
   contents — together with its sequence number — is written on chain.
   At this moment your place in line is fixed and public, but *what*
   your order says is still hidden.
2. **Reveal & execute.** In a later step the full order is revealed.
   The program re-computes the hash, checks it matches the commit,
   verifies your signature, and only then dispatches the order into
   the matching engine.

Locking the position before revealing the contents is what makes
ordering provably fair. It produces four guarantees:

- **FCFS is enforced, not trusted.** The sequence is chosen at commit
  time and is immediately public and immutable. There is no window in
  which a privileged actor can insert an order ahead of yours after
  seeing it.
- **No payload-based reordering.** Until your order is already locked
  into its place, nobody can see what it contains — so ordering cannot
  be influenced by order contents. This neutralizes the most common
  on-chain MEV: reordering a block to extract value from pending
  trades.
- **No tampering.** At reveal, any change to the order — price, size,
  the account list, a single bit — produces a different hash, and the
  transaction is rejected.
- **No replay.** Each consumed order is recorded on chain, so a signed
  order can never be fired twice.

## What this prevents

| Attack | Why it fails on Fermi |
| --- | --- |
| Front-running a pending order | Contents are hidden until the order is already sequenced. |
| Reordering a block for profit | Same-market order is fixed on chain before reveal; a reorder breaks the commit hash. |
| Editing an order after submission | Reveal re-hashes the payload; any edit is rejected. |
| Replaying a captured order | The consumed-order cache rejects duplicates. |
| Silently dropping an order | Every stage emits a queryable event; you can trace exactly where an order is. |

## Verifiability and tracing

Time priority on Fermi is a property of the protocol, the same way it
is inside a professional matching engine — except here it is publicly
verifiable and nobody has to be trusted to honor it. Every stage of an
order's life emits a structured event, so given a market and a
sequence number you can ask exactly where an order is and why:
accepted, locked, revealed, executed, or skipped, with the reason.

If an order is ever lost in transit (for example, an RPC failure drops
it), the queue does not wedge: after a short, bounded wait it can
advance past the missing slot so a single failure cannot stall a
market.

## Related

- [POSq Sequencing Layer](05-posq-sequencing-layer.md) — who assigns
  the order in the first place.
- [Fast Pre-Confirmations](07-fast-pre-confirmations.md) — how you see
  your fill before finality.
- [Matching Engine](16-matching-engine.md) — what happens once an order
  is dispatched.
