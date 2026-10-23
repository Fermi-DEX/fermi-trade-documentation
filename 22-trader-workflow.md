# Trader and market-maker workflow

A reliable client treats an order as a lifecycle with an identity. It does not equate HTTP success, relayer acceptance, transaction inclusion and a fill.

## Before signing

Load the program/group, market configuration, account state and current slot. Convert amounts to exact lots. Build the payload with explicit price, size, order type, self-trade behavior and timing. Build the canonical queued-perp account list, including the required health suffix. Sign the exact intent hash using the owner or authorized delegate.

Persist the signed request before sending it. Keep the payload, account metas, timing, client order ID and hash together; losing one field makes reconstruction and diagnosis harder.

## Track the result

| Stage | Evidence | What it establishes |
| --- | --- | --- |
| Submitted | Local request record | Client attempted delivery |
| Accepted | Relayer response | Service admitted the request and assigned its identity |
| Committed | Chain queue state / commit transaction | Hash was recorded at a sequence |
| Executed or failed | Queue outcome plus transaction logs | Program resolved that item |
| Filled / resting / canceled | Fill events and book/account state | Economic or order outcome |
| Reconciled | Chain-derived state at a stated commitment/slot | Read model caught up to the observed result |

Trigger orders use a separate withheld state until the keeper releases them. Their initial response need not contain a committed sequence.

## Retry without inventing another trade

After a timeout, query the known request/sequence and transaction status. Rebroadcasting identical signed Solana bytes keeps the same transaction identity; re-signing a new intent or changing its client order ID creates a different action. The bounded on-chain replay cache is insufficient as a permanent idempotency system.

If a signed transaction is still valid and its outcome is unknown, keep that uncertainty explicit. Do not assume a missing RPC response proves failure.

## Market-making implications

Cancel/replace actions compete in the same market sequence. A cancel cannot undo an earlier fill. Keep headroom for inventory, pending orders, fees and funding. Monitor both initial and maintenance health and include fills pending event consumption.

For FLP, check the vault lifecycle and delegate state before quoting. A recovery or breaker can revoke the delegate while signed intents remain pending. On-chain reveal authorization determines whether those intents can still execute.


## Implementation reference

Reviewed at `90267b20`. [executionQueue.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/src/executionQueue.ts) · [ctm_sequencer.proto](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/scripts/execution-queue/ctm_sequencer.proto) · [v5_terminal.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/bin/service-mango-execution-engine/src/v5_terminal.rs). Source links require access to the implementation repository.
