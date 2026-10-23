# Direct submission and its limits

The v5 direct pool is an alternative admission path that does not require a CTM commitment batch. It is a separate per-market account. A user stages an authorized payload there; after a speedbump, it can be promoted into the main AMQ sequence and executed under the queue's checks.

This path is useful only if the deployment creates, enables and services the pool. Newly initialized direct ingress is paused. A source implementation alone does not establish that users have an available fallback on a particular market.

## Lifecycle

```text
signed direct intent → staged pool item → eligible after delay
                    → promoted main-queue sequence → execution or failure
```

The PDA seeds are `execution-queue-v5-direct`, group and market index. The reviewed pool has 256 slots and a default speedbump of 10 slots. A configured speedbump can differ.

The signature domain is `mango-v5-direct-intent-v1`. It binds the account/signer context, target, payload hash, account hash, expiry and nonce. This differs from the CTM intent format. Use the corresponding helper; a signature for one path is not interchangeable with the other.

## Timing and ordering

Direct admission requires a nonzero expiry that covers the speedbump and satisfies the program's maximum horizon. Promotion assigns a sequence in the main queue. From then on, the item follows that sequence, not its original network send time.

The speedbump leaves room for normal CTM commitments to land. It does not establish a universal FCFS order between every direct sender and every relayed sender. Direct payload visibility also differs from hash-only CTM commitments.

## Availability boundary

Direct submission still needs Solana inclusion, an enabled pool, capacity, valid accounts, valid signatures, usable oracle data and an executor/keeper to make progress. It cannot bypass margin checks or an execution pause.

Before advertising it as a censorship fallback, inspect each market's pool and demonstrate enqueue, promotion and execution. A UI should distinguish “pool unavailable” from “request invalid” and expose the staged item ID and promoted sequence for tracing.


## Implementation reference

Reviewed at `90267b20`. [execution_queue_v5_direct.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/state/execution_queue_v5_direct.rs) · [execution_queue_v5.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/execution_queue_v5.rs) · [executionQueue.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/src/executionQueue.ts). Source links require access to the implementation repository.
