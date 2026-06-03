---
title: POSq Sequencing Layer
description: Verifiable off-chain sequencing with encrypted VDF ticks
---

# POSq Sequencing Layer

This is the short summary. For the full v1/v2 treatment, see
[30 - POSq Sequencing](../30-posq-sequencing.md).

The **POSq sequencing layer** is Fermi's ordering layer. It decides
which signed intents enter each market first, then anchors that order
into the on-chain execution queue before the on-chain program matches,
places, cancels, or rejects anything.

The important distinction is that POSq is not a black-box sequencer.
Sequencing is off chain, as it is in any blockchain system: without the
optimistic harness, ordering is still decided by Solana leaders, RPC routing,
priority fees, and transaction propagation. POSq makes that ordering
explicit, encrypted before reveal, and auditable.

For the research background, see the POSq paper:
[app.fermi.trade/research.pdf](https://app.fermi.trade/research.pdf).

## What POSq achieves

POSq gives Fermi three properties:

- **Verifiable ordering.** Orders are assigned to a VDF-tick-based
  sequence. The emitted tick log and commitments make reordering
  detectable instead of hidden inside an operator database.
- **Content privacy before ordering.** Users submit encrypted intents,
  so the sequencer orders opaque payloads rather than visible trade
  instructions.
- **Deterministic pre-confirmations.** Once an encrypted intent is
  sequenced and later revealed, the optimistic read layer can replay the
  deterministic on-chain matching path and predict the outcome before
  finality.

## V1: single-sequencer POSq

Fermi v1 runs POSq in **single sequencer mode**.

In this mode, one sequencer service receives encrypted transactions,
orders them over VDF ticks, emits the ordered commitments, and commits
the resulting sequence into the on-chain execution queue. The sequencer
does not see the transaction contents before they are ordered, and its
ordering choices are not merely private promises: they are tied to the
VDF tick stream and commitment log.

This means a v1 sequencer is not trusted like a normal centralized
matching engine. It cannot silently rearrange an already-emitted order
without creating evidence in the sequence/commitment trail. It also
cannot alter a user's signed payload, substitute accounts, replay the
intent, or execute anything off chain; the on-chain program still
verifies and executes the revealed intent.

What remains in v1 is an availability and admission assumption. A single
sequencer can be unavailable, slow, or refuse to admit a transaction
before it appears in the POSq log. That is why Fermi also exposes direct
on-chain submission as a backstop.

## V2: consensus-level safeguards

Fermi v2 is planned to add the consensus-level pieces around POSq:

- **Voting** over sequencer outputs.
- **Leader rotation** so one operator is not permanently in the
  sequencing role.
- **Permissionless participation** so sequencing and verification can
  be opened beyond a fixed operator.

Those additions are intended to close the remaining v1 gaps around
admission, liveness, and single-operator control. The core sequencing
model remains the same: encrypted transactions, VDF ticks, verifiable
ordering, and on-chain execution.

## How POSq connects to the exchange

POSq does not match orders. It does not own custody. It does not mutate
balances.

Its output is an ordered stream of intents. That stream is committed to
Fermi's on-chain execution queue. The deployed Solana program then
verifies the reveal, checks the user signature and accounts, dispatches
the intent into the matching engine, updates risk, and emits events.

So the split is:

- POSq: verifiable off-chain sequencing.
- Optimistic harness: non-binding deterministic simulation and
  streaming.
- Fermi program: authoritative on-chain execution.

## What POSq does not claim in v1

POSq v1 does not claim fully decentralized sequencing. It does not yet
have permissionless sequencer participation, leader rotation, or
consensus voting.

The more precise v1 claim is: ordering is not an opaque trust assumption.
The sequencer operates over encrypted VDF ticks, and reordering relative
to the emitted POSq sequence is detectable. Censorship before admission
is mitigated by direct on-chain submission today and is targeted more
directly by the v2 consensus roadmap.

## Related

- [FCFS Ordering](06-fcfs-ordering.md)
- [Fast Pre-Confirmations](07-fast-pre-confirmations.md)
- [Direct On-Chain Submission](25-direct-onchain-submission.md)
