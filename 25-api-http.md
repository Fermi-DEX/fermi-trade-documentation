# HTTP reads and state views

The harness serves a read model built from chain observations and provisional replay. Its HTTP API is not an alternate settlement system. Every client should retain the response's view, freshness and source context alongside displayed data.

The service URL is deployment configuration. Internal example ports are not public endpoints or availability promises.

## Common read routes

| Route | Purpose |
| --- | --- |
| `GET /state/markets` | Market list and metadata |
| `GET /state/markets/:market` | Market state |
| `GET /state/book/:market` | Book view |
| `GET /state/queue/:market` | Queue state; `source=onchain` selects the chain-read path |
| `GET /state/users/:owner` | User account view |
| `GET /state/balances/:owner` | Balance/position view |
| `GET /state/orders/:market` | Market orders with supported filters |
| `GET /state/trades/:market` | Recent trade view |
| `GET /state/full` | Full snapshot |
| `GET /trace`, `GET /trace_full` | Intent and replay diagnostics |
| `GET /healthz`, `GET /metrics` | Service health and metrics |

Routes, accepted market identifiers and query parameters must match the deployed wrapper. The server source is the wire-behavior reference; illustrative URLs here omit deployment-specific auth and filters.

## Read semantics

The harness distinguishes confirmed, optimistic, optimistic-preplay and executable-now concepts. Support can vary by endpoint and backend. A chain-sourced request is still an observation at a commitment and slot, potentially cached or delayed; it does not mean finalized global state at the moment the browser renders it.

Use optimistic views for responsive interaction with visible status. Use chain-derived evidence for reconciliation, accounting and resolving ambiguous outcomes. During divergence, stale-data or provider incidents, show degraded status rather than silently treating a cached preview as authoritative.

## Writes and administrative endpoints

Relayer submission is a separate API. The HTTP bridge adapts requests into gRPC. Internal ingest and replay endpoints are service interfaces and need deployment access controls; they are not public instructions to mutate settled balances.

## FLP reads

`/state/vaults/:vault`, `/state/vaults/:vault/portfolio` and `/state/vaults/:vault/users/:owner` expose vault and user views when the FLP reader is configured. These reads are chain-derived rather than optimistic AMQ settlement promises. Treat missing or unsupported accounting data as unavailable, not zero. See [FLP integration](35-flp-integration.md).


## Implementation reference

Reviewed at `90267b20`. [continuum-state-harness.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/scripts/execution-queue/continuum-state-harness.ts) · [continuumHarnessClient.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/src/continuumHarnessClient.ts) · [flp-metadata-api.md](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/docs/flp-metadata-api.md). Source links require access to the implementation repository.
