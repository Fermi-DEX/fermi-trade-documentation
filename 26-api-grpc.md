# 25 · gRPC API (Relayer)

The relayer is the gRPC entry point for the
[POSq fast path](30-posq-sequencing.md). It:

1. Accepts user-signed intents.
2. Validates them off-chain (signature, account staleness, oracle
   freshness, health, market constraints).
3. Submits the encrypted intent into POSq's per-market sequencing path.
4. Commits to the on-chain v5 queue in batches of up to 64.
5. Returns the assigned sequence to the user immediately.

The wire format is defined by
`ts/client/scripts/execution-queue/ctm_sequencer.proto`. Generate
language stubs from that file rather than handwriting clients.

## Service

```proto
service CtmSequencer {
  rpc SubmitIntent (SubmitIntentRequest) returns (SubmitIntentResponse);
  rpc CancelIntent (CancelIntentRequest) returns (CancelIntentResponse);
  rpc Health       (HealthRequest)       returns (HealthResponse);
  rpc Stats        (StatsRequest)        returns (StatsResponse);
}
```

## `SubmitIntent`

```proto
message SubmitIntentRequest {
  bytes  canonical_message  = 1; // bytes the user signed
  bytes  signature          = 2; // 64-byte Ed25519 signature
  bytes  authority_pubkey   = 3; // 32 bytes; matches signature
  bytes  account_list_hash  = 4; // 32-byte sha256 of accounts (relayer cross-check)
  uint64 market_index       = 5;
  uint64 client_order_id    = 6; // optional
  uint32 max_lifetime_slots = 7; // 0 = use relayer default
}

message SubmitIntentResponse {
  uint64 sequence       = 1;  // POSq-assigned per-market FIFO position
  string tx_signature   = 2;  // commit tx signature on Solana
  uint64 accepted_slot  = 3;  // slot at which the relayer admitted you
  uint64 expires_at_slot= 4;  // slot beyond which the intent auto-fails
}
```

The request body is the **bytes the user actually signed**, not a
JSON object. The relayer recomputes the canonical message from the
parsed payload and checks that it byte-equals
`canonical_message`. This protects against a buggy client signing
something different from what it sent.

### Acknowledgement timing

`SubmitIntent` returns after the intent has been sequenced by the POSq
fast path and the relayer has committed it on chain (i.e. the commit tx
is submitted and accepted by the RPC). Reveal/execute happens later; the
response does **not** wait for the fill.

To wait for the fill, subscribe to the harness fanout SSE stream
and watch for an event with your `client_order_id` (or your
authority pubkey).

### Errors

The relayer returns gRPC status codes plus a structured error body:

| Status | Application code | Meaning |
|---|---|---|
| `INVALID_ARGUMENT` | `INVALID_SIGNATURE` | Signature doesn't verify the canonical message. |
| `INVALID_ARGUMENT` | `STALE_ACCOUNT` | Local account view is older than chain; reload. |
| `FAILED_PRECONDITION` | `ORACLE_STALE` | Market oracle past `max_staleness_slots`. |
| `FAILED_PRECONDITION` | `HEALTH_PRECHECK_FAILED` | Order would put account into negative init health. |
| `FAILED_PRECONDITION` | `MARKET_REDUCE_ONLY` | Market is reduce-only and the order increases exposure. |
| `RESOURCE_EXHAUSTED` | `QUEUE_FULL` | Per-market queue saturated. |
| `RESOURCE_EXHAUSTED` | `RATE_LIMIT` | Per-authority rate cap exceeded. |
| `UNAVAILABLE` | `RPC_UNREACHABLE` | The relayer can't reach a Solana RPC. |
| `INTERNAL` | `RELAYER_INTERNAL` | Bug; report with `tx_signature` if any. |

Each error body includes a `reason` text field with a human-readable
description.

## `CancelIntent`

```proto
message CancelIntentRequest {
  bytes  authority_pubkey = 1;
  uint64 market_index     = 2;
  uint64 sequence         = 3;     // 0 = look up by client_order_id
  uint64 client_order_id  = 4;
  bytes  signature        = 5;     // signed cancel intent
  bytes  canonical_message= 6;
}

message CancelIntentResponse {
  bool   accepted        = 1;
  uint64 cancel_sequence = 2;
  string tx_signature    = 3;
}
```

Cancellation is **its own intent**: it has its own canonical message
(includes a "cancel" discriminator), its own sequence, its own
commit/reveal. It is not a side-channel update to a previously
submitted intent.

If you only know the client order id, set `sequence = 0` and provide
`client_order_id` — the relayer will resolve the on-book order id
from its mirror.

## `Health`

```proto
message HealthResponse {
  string version          = 1;
  uint64 current_slot     = 2;
  bool   ingress_paused   = 3;
  bool   execute_paused   = 4;
  uint32 active_markets   = 5;
}
```

Use as a liveness probe. A `READY` from the relayer doesn't mean
the on-chain queue is healthy — check the harness `/healthz` for
the queue's view.

## `Stats`

Per-market counters: intents accepted, rejected (by reason),
committed, revealed, failed, autodropped. Useful for dashboards.

## Constructing the canonical message

The canonical message is the SHA-256-equivalent serialization the
on-chain program will recompute. The TS / Rust SDKs do this for
you (`buildPerpPlaceOrderIntent` → `intent.canonicalMessage`); from
another language you must mirror
`canonical_user_intent_message_v2` exactly:

```
domain_separator || version || intent_kind || authority_pubkey
  || nonce || min_execute_slot || expires_at_slot
  || market_pubkey || fermi_account_pubkey
  || account_list_hash
  || payload_hash
```

(The exact field widths and ordering are in the on-chain code at
`programs/fermi-v1/src/instructions/execution_queue_v5.rs:671-682`.
Mirror it byte-for-byte; any drift causes `SignatureMismatch`.)

## Connection / retries

- Standard gRPC keep-alive applies; recommend `keepalive_time_ms =
  30_000`, `keepalive_timeout_ms = 10_000`.
- On `UNAVAILABLE`, retry with exponential backoff and a *fresh*
  intent (re-sign with a new nonce / `client_order_id`) — the
  replay cache may reject a duplicate retry.
- Submit at most one `SubmitIntent` per intent; idempotency keys
  are not currently supported on the wire.

## Rate limits

Per-authority rate limits exist to protect the relayer:

- `~50` intents/sec sustained.
- `~200` intents in any 1s burst.

Exceeding triggers `RATE_LIMIT`. For HFT use cases, contact the
operator for a raised limit (or run your own relayer instance — the
binary at `bin/service-fermi-execution-engine` is the same code).

## End-to-end with `grpcurl`

```bash
# health probe
grpcurl -plaintext relayer.fermi.exchange:9090 \
        ctm.CtmSequencer/Health

# submit (after producing canonical_message + signature off-line)
grpcurl -plaintext \
        -d '{"canonical_message":"...","signature":"...","authority_pubkey":"...","account_list_hash":"...","market_index":0}' \
        relayer.fermi.exchange:9090 ctm.CtmSequencer/SubmitIntent
```

Most users will just call the SDK — `SubmitIntent` is rarely raw-dialed
in production.
