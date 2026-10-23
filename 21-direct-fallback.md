# Direct submission and its limits

The v5 direct pool is an alternative admission path that does not require a CTM commitment batch. It is a separate per-market account. A user stages an authorized payload there; after a speedbump, it can be promoted into the main AMQ sequence and executed under the queue's checks.

This path is useful only if the deployment creates, enables and services the pool. Newly initialized direct ingress is paused. A source implementation alone does not establish that users have an available fallback on a particular market.

## SDK availability on r9

The reviewed SDK records r9 direct pools as absent at its 23 October 2026 check. Its CLI and high-level direct helpers reject the r9 preset. Use relayed submission for that preset.

For an explicitly prepared custom deployment, use `submitPerpOrderDirect`, `cancelPerpOrderByClientIdDirect`, or `cancelAllPerpOrdersDirect`. Supply the custom program and group. The helpers default to current slot plus 20 for expiry. The low-level builder requires a nonzero expiry. Direct admission does not support `minExecuteSlot`.

These SDK limits are separate from the protocol lifecycle described here.

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

Protocol reviewed at `90267b20`; standalone SDK references at `5318a579`. [execution_queue_v5_direct.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [execution_queue_v5.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [intents.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/intents.ts). Source links require access to the implementation repository.
