# Matching and event accounting

The matching engine runs inside the core Solana program. It takes an order, walks eligible opposing orders, executes at their prices and either posts or discards the remainder according to the order type.

## The path through a match

1. Derive the order's effective price and posting behavior.
2. Generate its book order ID and apply any configured immediate-order penalty.
3. Walk opposing orders, removing only a bounded number of expired entries.
4. Stop at the price bound, quantity bound, quote budget or match limit.
5. Apply self-trade behavior if the maker and taker use the same FermiAccount.
6. Reduce or remove maker leaves and append fill/out events.
7. Record taker exposure and fees, then post any eligible remainder.
8. Complete the applicable health checks before committing the transaction.

The executor supplies work and accounts. It does not supply an authoritative list of fills for the program to trust.

## Matching and event consumption are both on chain

A fill event records a trade selected by the matcher. Event consumption later applies bookkeeping to the affected accounts. Taker fields account for pending fills so exposure is not simply absent while the event waits. Maker orders and account state also need the event-consumption path to converge.

This split reduces how many trader accounts must be supplied to a matching transaction. It introduces an operational dependency: event queues must be consumed. FLP pricing explicitly rejects relevant unconsumed vault events, because pricing shares from stale maker accounting could transfer value between LPs.

## A successful call may fill nothing

A limit order can rest without filling. A post-only order that would cross can return without posting. An IOC can leave no resting order. A match limit can stop further taking. These are business outcomes, not necessarily transaction errors.

Conversely, a failed Solana transaction rolls back its writes. The queue also has branches that successfully record an item's terminal failure and advance the head. Inspect the transaction status, `QueueItemProcessed`, fill events and current order state together.

A UI should never infer “filled” solely from an accepted relayer response, a commit signature or a successful reveal transaction.


## Implementation reference

Reviewed at `90267b20`. [book.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [perp_consume_events.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [execution_queue_v5.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [common.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/common.rs). Source links require access to the implementation repository.
