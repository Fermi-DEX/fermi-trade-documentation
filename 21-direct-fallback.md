# 20 · Direct Fallback Pool

[POSq/relayer](30-posq-sequencing.md) is the fast path on Fermi. In v1
it runs with a single sequencer that orders encrypted transactions over
VDF ticks, making reordering detectable. If you can't reach that fast
path, or if it refuses admission before your intent enters the POSq log,
there is a permissionless on-chain alternative: the **direct submission
pool**.

## What it is

`execution_queue_v5_enqueue_direct_market` is an on-chain
instruction that lets any signer push an intent directly into the
per-market queue, **bypassing the relayer entirely**.

Once staged in the direct pool, the executor (or any keeper) can
promote it into the main ring after a fixed slot speed-bump, and
from then on it follows the standard reveal/execute path.

## When to use it

- **Fast-path outage.** You need to cancel an order or close a
  position and POSq/relayer is unreachable.
- **Pre-admission censorship concern.** A v1 sequencer/relayer that
  refuses to admit your intent (whether by accident or design) can be
  bypassed.
- **Programmatic on-chain integrations.** Another Solana program
  wants to invoke a Fermi order via CPI without involving any off-
  chain service. See [24 - Direct CPI](24-direct-cpi.md).

When **not** to use it:

- **Latency-sensitive trading.** The direct path has a built-in
  speed-bump (configurable; tens of slots typical) before it can be
  executed. The relayer path is faster.
- **Routine flow.** The relayer is cheaper (CPU, fees) and handles
  retries, optimistic state, and account hot-cache for you.

## Mechanics

The direct pool is a separate per-market staging area. The user
submits a transaction that includes:

1. The signed intent payload (same canonical form the relayer would
   commit).
2. The full account list the intent will touch (fermi account,
   perp market, bank, oracle, etc.).
3. An Ed25519 preinstruction proving the user signed the payload.

The on-chain program:

1. Verifies the user's signature (Ed25519 preinstruction must match
   the intent's canonical message).
2. Hashes the payload and accounts.
3. Stages the item in a per-market direct pool with `min_execute_slot
   = current_slot + direct_speedbump_slots`.

After the speed-bump, the executor (or any caller) can promote the
direct entry into the main ring by assigning it a sequence and
calling the standard reveal/execute path. The reveal path then runs
the same verification + dispatch as a relayer-committed intent.

## Direct pool vs main ring

| | Direct pool | Main ring |
|---|---|---|
| Path | User → on-chain direct pool → promote → execute | User → relayer → commit → reveal → execute |
| Sequence assigned | At promotion time | At commit time |
| Latency | `≥ direct_speedbump_slots` (tens of slots) | Sub-second once relayer admits |
| Throughput | Lower (every direct submit is its own tx) | Higher (relayer batches up to 64 commits) |
| Fee paid by | User (full Solana tx fee) | Relayer (committed batch) |
| Replay protection | Same on-chain `replay_cache` | Same on-chain `replay_cache` |

## Programmatic submission

```ts
import { buildDirectEnqueueIx, signIntent } from '@fermi/client';

const intent = await client.buildPerpPlaceOrderIntent(fermiAccount, perp, order);
const signed = await signIntent(intent, owner);

const ix = await buildDirectEnqueueIx(client, group, perp, signed);

const tx = new Transaction().add(
  Ed25519Program.createInstructionWithPublicKey({
    publicKey: owner.publicKey.toBytes(),
    message: signed.canonicalMessage,
    signature: signed.signature,
  }),
  ix,
);

await sendAndConfirmTransaction(connection, tx, [owner /* fee payer */]);
```

The fee payer can be any signer; only the user's signature on the
*payload* is verified.

## Speedbump configuration

The speed-bump is per-market and configurable. Default is conservative
(tens of slots ≈ several seconds). It exists because:

- It deters spam: each direct submit is a full Solana tx, but a
  hostile flood would still be expensive.
- It gives the relayer a chance to admit the intent first if the
  user wants to "race" — the relayer path is faster.

The exact value is exposed in the `ExecutionQueueV5Header` /
`SubQueueHeaderV5` and can be queried via the SDK.

## Cancellation through direct path

The most common production use of the direct path is **cancellation
under relayer outage**:

```ts
const cancelIntent = await client.buildPerpCancelOrderIntent(
  fermiAccount, perp, orderId,
);
const signed = await signIntent(cancelIntent, owner);
const ix     = await buildDirectEnqueueIx(client, group, perp, signed);
await connection.sendTransaction(buildEd25519PreIxTx(signed, ix), [owner]);
```

This is the recommended fallback if the relayer is down and you
need to remove a resting order before the market moves.

## Limits

- The direct pool has a fixed per-market capacity (smaller than the
  main ring). If saturated, new submissions are rejected with
  `ExecutionQueueDirectPoolFull`.
- The direct path **does not bypass health checks** — your intent
  still has to be valid at execution time. If your account is
  liquidatable, your direct-submitted place order will still fail.
- The direct path does not bypass the replay cache. The same
  10-slot / 512-entry window applies; re-signing a fresh intent
  (different nonce / client order id) is required for retries.
