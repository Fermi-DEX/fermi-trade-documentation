# Harness, preplay and low latency

The harness makes the exchange responsive by computing and serving provisional state locally. It does not shorten Solana finality or move the binding match off chain.

A chain-only UI waits for execution and a subsequent read before showing anything. A preplay UI can show what an accepted request would do to the latest local state, then reconcile that prediction with the actual result.

## Two inputs, two kinds of evidence

The harness ingests accepted intents and chain observations. Intents tell it what work is expected. Chain events/account updates tell it what happened. A useful implementation keeps those identities separate until they can be reconciled.

The current stack supports a native Rust engine behind a TypeScript HTTP/SSE wrapper. The relayer can use embedded local state for admission and preplay. The TypeScript backend remains a compatibility/debug option. Choosing Rust does not remove the wrapper, its queues, refresh jobs or provider dependencies.

## Why ordering helps

If the harness knows that A precedes B, it can apply A and then B locally. It does not need to guess whether a later same-market queued order will jump ahead after admission. This makes a provisional book and fill stream useful before reveal completes.

However, the input state can still change: oracle prices move, a shared account trades elsewhere, liquidation runs, a direct instruction changes the book, a commitment fails to land, or a queue head is removed. The local model must also match the deployed program's behavior. These are reasons to reconcile, not reasons to call a preview final.

## Measure the stage you claim

| Measurement | Start → end | What it excludes |
| --- | --- | --- |
| Acceptance latency | Relayer ingress → admission/signing point | Later chain inclusion and execution |
| Optimistic processing latency | Ingress → local preplay update | Chain reconciliation/finality |
| Commit latency | Submission/admission → observed commitment | Reveal and matching |
| Execution latency | Admission → observed item execution | Potential later confirmation/finality and event-consumption lag |
| Reconciliation lag | Chain outcome → corrected read model | Earlier request waiting time |
| Read latency | API request → response | Freshness of the data returned |

Report commitment level, workload, market count, concurrency, failures and p50/p95/p99 alongside measurements. A fast response carrying old state is a freshness failure. A low median does not describe a stalled tail.

No fixed millisecond execution or finality guarantee is established by this documentation review. Protocol caps and configured polling intervals are not performance measurements.

## Mechanisms that reduce latency

Local state and blockhash caches avoid repeated RPC reads on hot paths. Preplay runs near admission. Batching amortizes commit and reveal overhead. Per-market queues reduce shared queue-account contention. Streaming account/event updates can refresh state sooner than polling, and fanout separates many readers from the main engine.

Each mechanism has a cost: caches need freshness rules, batches can add waiting time, same-market heads can block, cross-market accounts still share locks, and streams need replay/deduplication. Background reconciliation and broad account scans can also delay the HTTP wrapper if configured too aggressively.

## Reconciliation behavior

Use chain-derived fills and order/account snapshots to correct simulated outcomes. Track pending identities so a preview and its observed fill are not counted twice. Remove phantom orders and rebase remaining pending work after divergence. Preserve view, slot and freshness in the API and UI.

When readiness or parity is uncertain, surface degradation and use an appropriate chain-derived fallback. Switching read sources can improve correctness while increasing latency. It cannot make an already uncertain execution outcome known without chain evidence.


## Implementation reference

Reviewed at `90267b20`. [engine.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/rust-harness/src/engine.rs) · [replay.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/rust-harness/src/replay.rs) · [continuumHarnessRustBackend.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/src/continuumHarnessRustBackend.ts) · [continuum-state-harness.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/scripts/execution-queue/continuum-state-harness.ts) · [main.rs — bin source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/bin) · [harness-read-optimization.md](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/harness-read-optimization.md). Source links require access to the implementation repository.
