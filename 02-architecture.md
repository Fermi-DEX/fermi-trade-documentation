# Architecture: one order, two views, one execution authority

Fermi separates a fast interaction path from the chain's economic state. A signed request enters an ordered market stream. The program stores a commitment to it, then accepts its exact payload when that item reaches the queue head. Meanwhile, a local harness can compute a provisional result from the same request stream and its current chain snapshot.

The useful mental model is a numbered work queue beside an on-chain exchange. The queue decides which admitted job may run next. The exchange decides whether that job is valid and what it does. The harness shows the result it expects before the chain completes the job.

```text
Wallet signs exact payload + account list + timing
                         |
                         v
              Relayer admission and sequence
               +----+------------------+
               |                       |
               v                       v
        Optimistic local replay     Commit hash to AMQ
                   |                   |
            provisional view       Reveal at head
                   |                   |
                   |             On-chain exchange
                   |          matching + health + events
                   |                   |
                   |          consume / settle / confirm
                   |                   |
                   +<---- reconcile chain result -----+
```

## Follow a buy order

**1. Authorize.** The client encodes a buy with a size, price bound, order behavior and timing envelope. Its signature binds the group, account, signer, target market, payload hash, account-meta hash, timing and client order ID. A relayer cannot change the price or substitute a different account list while retaining that signature.

**2. Admit and order.** The relayer checks the request and reserves a sequence for its market. The reviewed Rust path has a per-market sequence-allocation lock and local preplay. Admission is an off-chain decision. It may reject requests before any on-chain record exists. The [POSq chapter](30-posq-sequencing.md) explains the additional evidence needed to connect sequence assignment to a fair arrival-order claim.

**3. Commit.** An authorized CTM signer signs a batch containing a first sequence and consecutive commitment entries. The program checks that signature, timing limits and available ring positions. It stores hashes, not the full CTM payloads. A commit confirms admission to the on-chain queue; it does not place or fill the order.

**4. Reveal and execute.** The executor supplies the payload and accounts for the current head. The program compares the reconstructed hash with the stored commitment, validates signature and current authorization where required, checks replay and account layout, and dispatches into exchange logic. Order matching and risk checks happen here on chain.

**5. Complete accounting.** Matching produces on-chain fill/out events and records taker exposure. Event consumption applies deferred maker/taker bookkeeping. PnL settlement can later move perp value into a bank balance. These are distinct transitions; a match is not automatically a wallet withdrawal.

**6. Reconcile.** The harness replaces or corrects provisional state using observed chain outcomes. A successful transaction can contain an item failure or a no-op order outcome. Integrators must inspect queue outcomes and actual fill/order state.

## How the queue enforces FCFS

Suppose a market's head is sequence 41, and sequence 42 contains a more attractive trade for a validator. Revealing 42's payload against head 41 fails the commitment comparison. Reordering Solana transactions cannot turn 42 into 41. The executor must resolve 41 before processing 42.

“Resolve” includes execution, expiry, terminal failure and permitted recovery. A missing sequence can be skipped under gap rules. An administrator can pause execution and reclaim a head. Therefore the precise guarantee is **ordered resolution of admitted market sequences under the queue's rules**, not guaranteed fills for every accepted request.

Three orderings must stay separate:

| Ordering | Meaning |
| --- | --- |
| Arrival / admission | Which request the sequencing service recognizes first |
| AMQ sequence | Which committed request the program resolves first within a market |
| Book price-time priority | Which resting order trades first at the best eligible price |

A better-priced resting order wins over an older worse-priced order. At equal prices, the book's insertion sequence gives time priority. No global sequence orders all markets, and maintenance or enabled direct instruction paths are not automatically part of the AMQ stream.

## Why feedback can be fast

The relayer and harness do not need to wait for a full RPC round trip for every display update. They can use cached chain state, local Rust preplay, event streams and batched transaction delivery. Once the request order is known, replay has fewer unknowns than a preview whose order may still change.

It still has unknowns: oracle updates, other market activity on a cross-margin account, liquidations, direct calls, stale snapshots, missing events and failed transactions. Ordering makes preplay useful; it does not make a preview final. [Harness and latency](36-harness-and-latency.md) defines what each latency measurement actually measures.

## What is shared and what can run in parallel

Each v5 market has its own queue PDA. Unrelated market queues can progress separately, and commit/reveal batching amortizes transaction overhead. Same-market execution remains serial at the head. Shared trader accounts, banks and other writable accounts can also serialize transactions across markets. Queue capacity and transaction-size limits bound bursts; batching cannot remove those limits.

## FLP uses the same exchange

The FLP program owns a trading account through its authority PDA. Its delegated market maker submits signed v5 intents, subject to the core delegate-intent gate. The vault does not replace matching or margin. It adds rules for whose capital is active, how shares are priced, when exit exposure ends, and how recovery reduces inventory.

The vault's withdrawal FIFO is a queue of **epoch batches**. It is separate from the exchange's queue of **trade intents**. Mixing the two hides an important distinction: a trade queue decides execution order; a withdrawal queue decides which LP batch can receive cash next.

Read [AMQ mechanics](20-execution-queue.md), [FLP accounting](32-flp-accounting.md), and [trust boundaries](37-security-and-invariants.md) next.


## Implementation reference

Reviewed at `90267b20`. [execution_queue_v5.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/execution_queue_v5.rs) · [execution_queue_v5.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/state/execution_queue_v5.rs) · [main.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/bin/service-mango-execution-engine/src/main.rs) · [engine.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/rust-harness/src/engine.rs) · [close_epoch.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/close_epoch.rs). Source links require access to the implementation repository.
