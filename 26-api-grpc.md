# Relayer gRPC and signed intents

The reviewed `ctmsequencer.CtmSequencerRelayer` service defines one RPC: `SubmitIntent`. Generate bindings from its protobuf. Methods such as `CancelIntent` are not part of this schema; cancellation is represented by the appropriate signed payload or a separate supported service path.

## Request groups

| Fields | Meaning |
| --- | --- |
| `group`, `execution_queue`, `market` | Deployment and target accounts |
| `payload`, `remaining_accounts` | Exact encoded operation and account metas |
| `user_owner`, `mango_account`, `user_signature` | Intent signer, trading account and authorization |
| `min_execute_slot`, `expires_at_slot` | Queue timing envelope |
| `intent_version`, `target_kind`, `target_index` | Versioned routing and hash context |
| `client_order_id` | Hash-bound identifier/randomizer; trigger orders use a specific terms commitment |
| `base_fee`, `max_fee_lamports` | Service fee inputs; the cap is relayer-local |
| `trigger_order` | Optional withheld stop/take-profit terms |

The historical field `user_owner` carries the intent signer; with enabled delegate support, it can be the current delegate. `mango_account` is the Fermi trading account. Preserve these wire names when generating clients.

## Response semantics

A normal response includes the assigned sequence, a transaction-signature field, message bytes and optional optimistic preplay JSON. `accepted_latency_ms` measures the relayer's admission/signing stage. `optimistic_processed_latency_ms` measures local preplay completion. Neither measures chain finality.

A trigger response instead supplies `trigger_order_id` and status while the request remains withheld. It has no committed trade sequence at that point.

A transaction signature is a lookup key. Verify whether it represents a commit or later stage in the deployed path and inspect chain status; its presence is not proof of a fill.

## What the service sees

The schema sends payload bytes and account metas. The reviewed relayer parses the payload and constructs hashes locally. This interface does not itself specify an encrypted VDF-verification protocol. Transport encryption and POSq's proposed order-before-reveal construction are different matters; see [POSq](30-posq-sequencing.md).

## Failure and retries

Admission can fail on signature, version, account layout, timing, capacity, fees, local-state readiness or risk prechecks. Later execution can fail independently. Preserve the server's error details and the signed request identity. On an ambiguous timeout, reconcile before signing another economically equivalent request.


## Implementation reference

Reviewed at `90267b20`. [ctm_sequencer.proto](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/scripts/execution-queue/ctm_sequencer.proto) · [main.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/bin/service-mango-execution-engine/src/main.rs) · [v5_precheck.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/bin/service-mango-execution-engine/src/v5_precheck.rs). Source links require access to the implementation repository.
