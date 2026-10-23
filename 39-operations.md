# Operating the execution and accounting pipeline

An operationally healthy system advances accepted work and reconciles economic state. A live process or successful health endpoint is necessary but insufficient.

## Execution pipeline

Monitor accepted/rejected requests by reason, committed sequences, queue head and depth, reveal attempts, per-item outcomes, gaps/reclaims, oracle validity, event-queue backlog and reconciliation lag. Break latency down by stage and market.

Persist sequence state and reveal material before relying on them for recovery. A landed hash without its payload, signature or account list can block the head. Preserve WALs and terminal-outcome records during restarts; do not reset a local counter to hide a discrepancy with chain state.

When a head stalls, inspect the actual head and timing first. Determine whether the commitment exists, reveal bytes are available, the transaction can still land, the oracle/accounts are valid, and execution is paused. Use an explicit reasoned recovery only when its preconditions and impact are understood. Record the discarded sequence and reconcile the harness.

## Read pipeline

Track response latency and data freshness separately. Monitor stream progress, RPC failure rates, queue/account slots, replay backlog and divergence. The Rust backend still runs behind an HTTP/SSE wrapper, so slow background work can affect client reads even if local execution is fast.

Use chain-derived snapshots to resolve material disagreement. Replaying an event stream must be idempotent. A downstream cache repair should follow the writer's correct state and preserve enough evidence to explain the correction.

## FLP epoch pipeline

Before each close, consume relevant vault events, refresh account state and construct the correct FIFO/account suffix. Send the close within the configured funding window. Inspect both transaction success and `FlpEquityClose` / `FlpEquityFundingSkipped` outcomes. Claims can follow funded records; held deposits require refunds.

A successful late close can leave exits deferred. A reason-4 bank-liquidity failure needs a liquidity response, not automatic extra inventory liquidation. Public recovery eligibility depends on recorded cash/health failures. Track the oldest head, its first failure time, latest reason and applicable grace.

Monitor delegate/pause/breaker state, spot quote, indicative NAV, health, active perp/event queues, bank liquidity and fee-recipient account readiness. Flat but active perp positions can retain oracle/account requirements until deactivated.

## Signed transaction recovery

The FLP workers journal signed actions before sending. While outcome is uncertain, rebroadcast the same bytes and inspect signature status. Replan only after confirmed success, a terminal error/rejection, or proof the transaction expired without landing. Finalized block height and signature history are relevant to that proof.

Deleting an unresolved journal entry can allow a second economically equivalent action while the first is still live. Preserve the record and resolve its chain state instead.

## Release checks

Keep source revision, executable hash, IDL, SDK, account layout and operational configuration together. Check all authority relationships and the core delegate-intent gate before enabling a vault MM. Verify direct-pool availability market by market before offering it to users.

This documentation branch changes explanations and navigation. It does not deploy a program, change trading parameters or attest production readiness.


## Implementation reference

Reviewed at `90267b20`. [v5_terminal.rs — bin source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/bin) · [security-liveness-operations.md](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/docs/security-liveness-operations.md) · [service.cjs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/operations/service.cjs) · [worker_adapter.py](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/operations/worker_adapter.py) · [close_epoch.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/close_epoch.rs). Source links require access to the implementation repository.
