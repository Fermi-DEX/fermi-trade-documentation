# Streams and reconciliation

The harness exposes Server-Sent Events (SSE) for one-way updates. Common routes include `/state/stream`, `/state/stream/frontend` and `/state/stream/trades`. Downstream fanout or Redis-backed services can distribute those updates without making every client query the core harness.

Solana RPC WebSocket subscriptions and optional LaserStream ingestion are upstream inputs. They are different from the client-facing SSE API.

## Bootstrap a client

1. Establish a snapshot and stream strategy supported by the deployed endpoint.
2. Record snapshot slot/view and any stream cursor or event identity.
3. Apply updates idempotently; an event can arrive again after reconnect or replay.
4. Detect gaps, stale data and source changes.
5. Fetch a fresh snapshot when continuity cannot be established.

SSE reconnection alone does not guarantee replay of every missed event. Verify whether the endpoint retains history and honors a resume cursor. A field named `seq` may be a service event sequence, a market queue sequence or a book sequence; they are not interchangeable.

## Optimistic and observed events

An optimistic fill is a model result. A chain fill is evidence that the matcher selected a trade in an included transaction. Confirmation level, subsequent reconciliation and event consumption still matter. Reconcile both identity and status so that a provisional fill followed by a chain fill is not counted twice.

A correction should remove or replace stale optimistic orders and fills. It should not append the corrected result as if it were another trade. Accounting exports should use the appropriate chain-derived records.

## Stream acceleration

The optional LaserStream path can update exact queue accounts and program events more promptly than polling. RPC remains necessary for bootstrap, fallback and audits. The wrapper supports active/shadow modes and replay checkpoints. A faster source does not change on-chain validity or provide finality earlier.

Monitor the last useful event and observed slot as well as connection liveness. A connected socket carrying stale state is not a healthy trading feed.


## Implementation reference

Reviewed at `90267b20`. [continuum-state-harness.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/scripts/execution-queue/continuum-state-harness.ts) · [harness-read-optimization.md](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/harness-read-optimization.md) · [continuumHarnessClient.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/src/continuumHarnessClient.ts). Source links require access to the implementation repository.
