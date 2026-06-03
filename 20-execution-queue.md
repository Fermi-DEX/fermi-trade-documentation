# 19 · Execution Queue v5

The execution queue (the "v5 queue") is the on-chain state machine
that enforces the POSq-produced order before intents touch the order
book. Every order placed via the fast path goes through it.

Goals it solves:

1. **Verifiable ordering.** Same-market intents execute in the exact
   order committed from the POSq sequence; a validator that tries to
   reorder breaks the commit hash and the tx fails.
2. **Account-substitution resistance.** The account list is part of
   the user-signed intent; a relayer that swaps accounts after
   signing is detected at reveal.
3. **Replay protection.** Once an intent hash is consumed it cannot
   be re-submitted for `~10` slots / `512` entries.
4. **Censorship fallback.** A direct-submit pool lets users get
   intents on chain without relayer cooperation.
5. **Liveness under failure.** Expired or stalled intents can be
   skipped so a single bad reveal doesn't wedge the market.

## Architecture

There is **one `ExecutionQueueV5` account per perp market**. The
PDA is seeded by `[group, "ExecutionQueueV5", market_index]`. Total
size is ~394 KB including a 1024-slot per-market ring, a sub-queue
header, and a 512-entry replay cache.

```
ExecutionQueueV5
├── header                ExecutionQueueV5Header
├── sub_queue_headers[1]  SubQueueHeaderV5   (one per bound market)
├── items[1024]           CommitItemV5       (per-market ring of pending intents)
└── replay_cache[512]     ReplayEntryV5      (consumed intent hashes for replay protection)
```

*Source: `state/execution_queue_v5.rs:302-310`.*

### `SubQueueHeaderV5` (64 bytes)

Holds the head pointer and ring-buffer state for one market:

| Field | Purpose |
|---|---|
| `market_index` | which `PerpMarket` this sub-queue is bound to |
| `active` | bound flag |
| `paused_ingress`, `paused_execute` | per-market kill switches |
| `live_count` | number of pending items in this market's ring |
| `gap_wait_slots` | how many slots to wait before skipping a gap (default 4) |
| `soft_limit` | optional admission cap (0 = full ring capacity) |
| `next_sequence_to_execute` | **the head** — next seq the executor must process |
| `max_seen_sequence` | highest seq ever committed |
| `gap_observed_slot` | slot at which a gap was first observed |
| `first_failure_slot` | slot at which the head first failed |

### `CommitItemV5` (96 bytes per item)

One slot in the ring:

| Field | Purpose |
|---|---|
| `sequence` | per-market monotonic order index |
| `min_execute_slot` | earliest slot at which this intent may execute |
| `expires_at_slot` | latest slot; past it, intent is auto-failed |
| `ingress_slot` | slot at which the commit landed |
| `first_failure_slot` | first slot the reveal failed (for retries / autodrop) |
| `commit_hash` | SHA-256 of the canonical signed-payload-plus-accounts |
| `status` | `Empty(0)`, `Committed(1)`, `Revealed(2)`, `Failed(3)` |
| `retries` | execution-attempt counter |
| `flags` | reserved |

### `ReplayEntryV5` (40 bytes per entry)

The replay cache stores recently consumed intent hashes:

| Field | Purpose |
|---|---|
| `intent_hash` | SHA-256 of the canonical user intent (without sequence) |
| `consumed_slot` | slot at which this hash was committed |

Entries older than `~10` slots are overwritten in the ring; the
cache is large enough that any real replay attempt within that
window is detected.

## The lifecycle of one intent

```
USER SIGNS INTENT
  ↓
[off-chain]  POSq/relayer validates: signature, accounts, health
  ↓
COMMIT      relayer writes POSq-ordered CommitItemV5 with status=Committed
             into ring[sequence % 1024]; entry visible on chain.
  ↓
REVEAL +    executor submits full payload; on-chain program:
EXECUTE      ├─ recomputes payload hash, compares to commit_hash
             ├─ verifies user Ed25519 signature
             ├─ checks replay_cache; aborts if intent already consumed
             ├─ dispatches to handler (e.g. perp_place_order)
             ├─ on success → clear head, advance next_sequence_to_execute
             └─ on terminal failure (expired, hash mismatch, signature bad)
                 → clear head, status=Failed, advance head
                 on transient failure (health, oracle stale)
                 → increment retries; head stays
  ↓
[off-chain] stalls past min_execute_slot+grace → autodrop calls
            execution_queue_v5_reclaim_seq_market(reason=...)
```

## Sequence assignment

Sequences are assigned by POSq/relayer at commit time and validated on
chain (`state/execution_queue_v5.rs:221-227, 239-252`):

```rust
pub fn next_enqueue_sequence(&self) -> u64 {
    if self.live_count == 0 {
        self.next_sequence_to_execute
    } else {
        self.max_seen_sequence.saturating_add(1)
    }
}

pub fn validate_commit_sequence(&self, sequence: u64) -> Result<()> {
    require!(sequence >= self.next_sequence_to_execute,
             FermiError::InvalidSequenceNumber);
    require!(sequence < self.next_sequence_to_execute
                            .saturating_add(self.admission_limit()),
             FermiError::ExecutionQueueFull);
    Ok(())
}
```

So the fast path can never commit:

- A sequence that's already been executed (`< head`), or
- A sequence further than `admission_limit` (= 1024 default) past
  the head.

This bounds the ring usage and prevents wrap-around.

## Head advance

The head only advances by `1` per successful execution or admin drop
(`state/execution_queue_v5.rs:407-422, 261-264`):

```rust
pub fn clear_head(&mut self, sub_queue_idx: usize) -> Result<u64> {
    // require live_count > 0; zero the head slot; bump pointer
    self.items[phys] = CommitItemV5::default();
    self.sub_queue_headers[sub_queue_idx].note_head_advanced();
    Ok(seq)
}

pub fn note_head_advanced(&mut self) {
    self.live_count = self.live_count.saturating_sub(1);
    self.next_sequence_to_execute += 1;
}
```

No batch advance, no gap skipping (except via the explicit gap-
wait mechanism below). Strict FIFO.

## Gaps

A gap exists when `next_sequence_to_execute` points at a slot whose
status is `Empty` — i.e. the relayer committed `seq=10` and
`seq=12` but `seq=11` was lost. The on-chain program tracks the
first slot at which the gap was observed (`gap_observed_slot`).

If `current_slot - gap_observed_slot > gap_wait_slots` (default 4),
the executor is allowed to call
`execution_queue_v5_reclaim_seq_market(reason=GapTimeout)` to
advance past the missing slot. This trade is: brief stalls preferred
over indefinite wedging.

In practice the relayer should not intentionally commit sparse — gaps
arise from RPC failures, lost commits, or other operational faults. The
autodrop service handles them automatically, and the POSq/commit trail
is the audit surface for unexplained gaps.

## Replay protection

On reveal, before dispatch:

```rust
let intent_hash = sha256(canonical_user_intent_message_v2(payload, accounts));

for entry in replay_cache {
    if entry.intent_hash == intent_hash &&
       current_slot - entry.consumed_slot < replay_window_slots {
        return Err(ExecutionQueueV5IntentReplay);
    }
}

// after successful dispatch:
replay_cache[replay_write_cursor] = ReplayEntryV5 {
    intent_hash, consumed_slot: current_slot,
};
replay_write_cursor = (replay_write_cursor + 1) % 512;
```

So even if a malicious fast-path operator kept your signed payload and tried to
re-submit it, the second commit-reveal would hit the cache and
fail.

## Instruction summary

| Instruction | Description |
|---|---|
| `execution_queue_v5_commit_market` | Relayer commits a batch of up to 64 hashes. |
| `execution_queue_v5_enqueue_direct_market` | User submits intent directly (no relayer); staged in direct pool. |
| `execution_queue_v5_reveal_execute_market` | Executor reveals payload, verifies, dispatches. |
| `execution_queue_v5_execute_market` | Multi-lane executor (multiple candidate account sets). |
| `execution_queue_v5_drop_head_market` | Admin-only: drops current head (requires `paused_execute`). |
| `execution_queue_v5_reclaim_seq_market` | Admin: drops a specific sequence with a reason (Expired, LostRevealMaterial, RetryExhausted, GapTimeout, …). |

An earlier-generation `ExecutionQueueEnqueueCtm` instruction is
rejected with `Custom(6126) LegacyQueuesDisabled` — only v5 queue
instructions are accepted on the live program.

## Error codes you'll see

| Code | Name | Cause |
|---|---|---|
| `6076` | `ExecutionQueueFull` | Sequence past `next_sequence_to_execute + 1024`. |
| `6126` | `LegacyQueuesDisabled` | Trying to use an earlier-generation enqueue path; use the v5 queue. |
| `6127` | `ExecutionQueueSubQueueMarketIndexMismatch` | Item's `market_index` doesn't match the claimed market — account substitution detected. |
| `6128` | `ExecutionQueueSequenceNotPending` | Sequence is not `Committed`/`Pending`; already executed or cleared. |
| `6129` | `ExecutionQueueEmpty` | No pending items. |
| `6130` | `ExecutionQueueV5IntentReplay` | Intent hash already in `replay_cache`. |
| `6131` | `InvalidSequenceNumber` | Sequence `< head` or `≥ head + admission_limit`. |
| `6132` | `ExecutionQueueIngressPaused` | Market or global ingress paused. |
| `6133` | `ExecutionQueueExecutePaused` | Market or global execute paused. |
| `6134` | `ExecutionQueueEnvelopeExpired` | `expires_at_slot` already in the past at commit time. |
| `6135` | `ExecutionQueuePayloadHashMismatch` | Provided payload doesn't hash to commit hash. |
| `6136` | `ExecutionQueueAccountsHashMismatch` | Provided account list doesn't hash to commit hash. |

## Tracing an intent

Given `(market, sequence)` you can query the Continuum harness:

```
GET /trace/sequence/{market}/{seq}
```

It returns every emission point seen for that sequence:

- `relay_intent_status status=accepted|rejected`
- `v5_commit_debug seq=... commit_hash_hex=...`
- `relay_intent_status status=submitted` (with `tx_signature`) or
  `status=rejected`
- `v5_reveal_debug first_seq=... last_seq=...`
- Reveal tx outcome from on-chain logs
- `v5_autodrop` for admin drops
- `v5_reveal queue state head=... last_fired=...`

If any stage is missing, the trace explicitly says so. This is the
canonical debugging surface — see `fermi-v1/CLAUDE.md` for the
audit-trail invariant.
