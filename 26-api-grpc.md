# Relayer gRPC and signed intents

Use `FermiV1RelayerClient` with `gatewayGrpcAddr: 'v1.fermi.trade:443'` and the gateway UUID as `apiKey`. The client uses TLS by default and sends `x-api-key` metadata. Call `close()` when the client is no longer needed.

The SDK's `proto/ctm_sequencer.proto` defines one RPC: `ctmsequencer.CtmSequencerRelayer.SubmitIntent`. Normal integrations use the [order and cancellation helpers](22-trader-workflow.md). Custom bindings must use this SDK schema.

## Request fields

| Fields | Meaning |
| --- | --- |
| `group`, `execution_queue`, `market` | Deployment and target |
| `payload`, `remaining_accounts` | Encoded operation and exact ordered account metas |
| `user_owner`, `mango_account`, `user_signature` | Signer, Fermi account and signature |
| `min_execute_slot`, `expires_at_slot` | Timing envelope |
| `intent_version`, `target_kind`, `target_index` | Version and target context |
| `client_order_id` | Hash-bound identifier |
| `base_fee`, `max_fee_lamports` | Legacy fee alias and relayer-local fee cap |

`mango_account` is an essential wire field in r9. Keep that spelling when constructing a raw request. Public SDK calls use `fermiAccount` or `fermiAccountPk`. The SDK performs the wire mapping.

The client loader retains `uint64` values as strings. Do not convert sequences or IDs to imprecise JavaScript numbers. The helpers use intent version `2`, the canonical account list and the exact signed-message domain from [AMQ authorization](20-execution-queue.md).

## Response and lifecycle

The SDK response has `sequence`, `tx_signature`, `user_intent_message`, `ctm_envelope_message`, `accepted_latency_ms`, and `optimistic_processed_latency_ms`.

A returned sequence means admission, not execution or a fill. The transaction signature is a lookup key. Read its chain status and reconcile queue outcomes, orders and trades. Neither latency field measures chain finality.

The SDK schema has no `trigger_order`, trigger status or optimistic preplay JSON field. Those fields in older service interfaces are not part of this client contract. There is no `CancelIntent` RPC. Cancellation uses an encoded signed cancellation payload through `SubmitIntent`.

## Authorization and failures

The gateway key permits service access. The user's signature authorizes the economic action. A gateway key does not replace the signer or onchain account checks.

The request transmits payload bytes and account metas. This schema does not define an encrypted VDF-verification protocol. See [POSq](30-posq-sequencing.md) for the distinction between the sequencing design and the reviewed execution path.

Admission can fail before any chain transaction. Onchain execution can fail after acceptance. Preserve error details and request identity. After an ambiguous timeout, reconcile before creating a replacement intent.

`RESOURCE_EXHAUSTED` becomes `RateLimitedError`. Back off before another attempt. A fee rejection and an uncertain network outcome require different recovery decisions.

## SDK reference

Reviewed at `5318a579`. [proto/ctm_sequencer.proto](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/proto/ctm_sequencer.proto) · [src/relayerClient.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/relayerClient.ts) · [src/trading.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/trading.ts).
