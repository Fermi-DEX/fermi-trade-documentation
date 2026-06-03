# 30 · POSq Sequencing

POSq is Fermi's verifiable sequencing scheme. It decides the order in
which signed intents enter each market, then anchors that order into the
on-chain execution queue before the Fermi program places, cancels,
matches, fills, rejects, or liquidates anything.

This page is the canonical reference for POSq in these docs. The
research paper is available at
[app.fermi.trade/research.pdf](https://app.fermi.trade/research.pdf).

## The basic split

Fermi separates **sequencing** from **execution**.

Sequencing is off chain. That is not unusual: every blockchain has an
off-chain ordering path before transactions land, whether the ordering
comes from RPC routing, priority fees, propagation latency, or the
current block leader. POSq makes that ordering path explicit and
auditable.

Execution is on chain. The deployed Fermi program owns the order book,
matching engine, order placement, cancels, fills, risk checks, funding,
PnL settlement, and liquidation. POSq does not match orders, mutate
balances, own custody, or decide whether an order is valid. It only
produces an ordered stream of intents for the on-chain queue to enforce.

The optimistic harness is separate again. It can simulate the
deterministic on-chain path so traders see a fast pre-confirmation, but
that simulation is non-binding. The chain remains the only authority.

## Why POSq exists

An exchange needs fast feedback, but a trader should not have to trust a
private operator database for ordering. A normal black-box sequencer can
say "this was the order" after it has already seen payloads and market
conditions. POSq narrows that trust surface.

POSq gives Fermi three practical properties:

- **Encrypted ordering before reveal.** The sequencer orders encrypted
  transactions before payloads are visible.
- **A VDF-tick ordering trail.** Transactions are assigned to an
  ordered tick stream, making the emitted sequence auditable.
- **On-chain enforcement.** The POSq order is committed to the
  per-market execution queue, and the queue executes in that committed
  order.

The result is not "trust the relayer to be fair." The more precise claim
is: once an intent enters the POSq flow and an order is emitted,
reordering relative to that emitted order is detectable, and the
on-chain queue enforces the committed sequence.

## V1: single-sequencer POSq

Fermi v1 runs POSq in **single-sequencer mode**.

In v1:

1. A user signs an intent.
2. The fast path receives the encrypted transaction.
3. POSq orders encrypted transactions over VDF ticks.
4. The relayer commits the resulting sequence and intent hash into the
   on-chain execution queue.
5. The executor later reveals the payload.
6. The on-chain program verifies the hash, signature, accounts, replay
   cache, health, market constraints, and then executes the intent.

The v1 sequencer is not fully decentralized, but it is also not a
black-box matching engine. It cannot silently reorder an emitted POSq
sequence without leaving evidence in the VDF-tick and commitment trail.
It cannot change a signed order, substitute accounts, replay an intent,
touch funds, or execute a fill off chain.

The remaining v1 assumption is **availability and pre-admission
censorship**. A single sequencer can be down, slow, or refuse to admit a
transaction before it appears in the POSq log. Fermi's direct on-chain
submission path exists as the v1 backstop for that case: a user can
bypass the fast path and submit directly to the program.

## V2: consensus-level safeguards

Fermi v2 is planned to add the consensus-level pieces around POSq:

- **Voting** over sequencer outputs, so ordering claims are checked by a
  participant set instead of accepted from one operator.
- **Leader rotation**, so the sequencing role is not permanently held
  by one service.
- **Permissionless participation**, so sequencing and verification can
  open beyond a fixed operator set.

These additions are intended to close the remaining v1 gaps around
admission, liveness, and single-operator control. They do not change the
core exchange model: POSq remains the off-chain sequencing layer, and
the Fermi program remains the on-chain execution authority.

## How POSq connects to FCFS

Fermi's first-come-first-served guarantee is enforced in two layers:

1. POSq emits an auditable per-market order.
2. The on-chain execution queue commits and executes that order
   monotonically.

The queue does not execute an intent just because the relayer says so.
At reveal time, the program checks the committed hash, account hash,
user signature, replay cache, expiry, health, and market rules. Only
then does the program dispatch the intent into the matching engine.

## How to read POSq claims in these docs

When another page says POSq provides fair or verifiable ordering, it
means:

- ordering is off chain but auditable;
- in v1, ordering is produced by a single sequencer over encrypted VDF
  ticks;
- reordering relative to the emitted POSq sequence is detectable;
- pre-admission censorship and sequencer availability are the remaining
  v1 gaps;
- v2 is planned to add voting, leader rotation, and permissionless
  participation;
- all execution remains on chain.

## Related

- [02 - Architecture](02-architecture.md)
- [20 - Execution Queue v5](20-execution-queue.md)
- [21 - Direct Fallback Pool](21-direct-fallback.md)
- [25 - HTTP & SSE API](25-api-http.md)
- [26 - gRPC API (Relayer)](26-api-grpc.md)
