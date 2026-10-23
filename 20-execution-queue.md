# The v5 execution queue: on-chain AMQ

The v5 AMQ is a per-market state machine that stores a sequence of commitments and resolves them from the head. It fixes the execution order of admitted items without moving matching or margin enforcement off chain.

## What the program stores

The queue PDA uses `execution-queue-v5`, group and the little-endian market index. The reviewed layout version is 7. Each account has one market subqueue and a 1,024-slot ring. A slot stores the sequence, commitment hash, timing bounds, ingress slot, failure/retry metadata and status. CTM payload bytes and their full account lists arrive at reveal.

The program distinguishes an unused slot from the same physical ring position used for another sequence. Admission checks the head-relative window and capacity; modulo indexing is not permission to overwrite live work.

| Constant in reviewed source | Value |
| --- | --- |
| Commit batch cap | 64 entries |
| Reveal batch cap | 32 entries |
| Queue capacity | 1,024 items per market |
| Replay cache | 512 consumed hashes |
| Replay retention | 20 slots, also bounded by cache capacity |
| Default gap wait | 4 slots |
| Default retries / configured cap | 3 / 20 |
| Maximum admission-relative delay | 2,400 slots |
| Maximum nonzero expiry horizon | 5,400 slots |

Transaction size, compute, account locks and configuration can impose lower practical limits.

## Commit authorization

The CTM authority signs a message under `mango-v4-commit-batch-v1`. It binds group, market, shard, first sequence and each entry's hash and timing. The program verifies the Ed25519 preinstruction and writes consecutive entries. The current shard ID must be zero.

A user intent uses the domain `mango-v5-user-intent-v2`, despite the helper name `canonical_user_intent_message_v3`. It binds:

- group, FermiAccount and intent signer;
- kind, target kind and market index;
- payload hash and canonical account-meta hash;
- minimum execution slot, expiry slot and client order ID.

The **user hash does not contain the assigned queue sequence**. The CTM batch binds a commitment to a sequence. This is the boundary between user authorization and sequencer assignment.

The account hash includes order and effective signer/writable flags, not just pubkeys. Solana can merge privileges for duplicate accounts across a transaction. Use the canonical builder and a distinct relayer fee payer; making the user signer the fee payer can change flags and break the commitment.

## Reveal at the head

The executor supplies reveal records and their account slices. The program checks queue pauses, head state and timing, reconstructs the commitment, validates payload and market/account shape, checks the required user signature and current owner/delegate authorization, applies the duplicate guard, and dispatches the action.

Place-containing payloads use the health-region checks. The program, not the preview, chooses fills and validates the result.

A higher-sequence payload cannot stand in for the head: its hash will not match that commitment. A validator can delay inclusion or reorder reveal transactions, but the program still reads its own current head.

## Resolution and failure

A head can execute, expire, fail terminal validation, exhaust an applicable retry budget, or be removed through authorized recovery. Missing heads have a bounded gap-wait mechanism when later sequences are known. A gap skip emits an outcome; it does not prove that a never-landed request traded.

Error behavior depends on where failure occurs. A returned transaction error rolls back the transaction. Some validated-item failures are recorded and clear the head in a successful transaction. In a reveal batch, a first commitment mismatch errors; a later mismatch can stop the batch while preserving earlier resolved items. Never map transaction success directly to “all items filled.”

Admin head-drop and reasoned reclaim require execution pause. These paths are explicit exceptions to normal head execution and must be monitored as such.

## Replay is bounded

The cache rejects recently consumed identical hashes. It is not a permanent nonce ledger: age and finite capacity limit retention. CTM intents can use zero expiry. The relayer therefore remains responsible for broader duplicate-admission discipline, and clients must reconcile ambiguous submissions before creating replacements.

Random client order IDs reduce accidental collisions and help conceal predictable commitment preimages. They do not make a valid signature permanently non-replayable. Direct submissions have additional expiry requirements, but clients must still account for the cache horizon and capacity.

## What FIFO does not establish

The queue does not prove first network arrival, verify a VDF, guarantee reveal availability, or order all direct maintenance instructions. It enforces market-local committed order subject to its resolution rules. See [POSq](30-posq-sequencing.md) for the sequencing design and [security](37-security-and-invariants.md) for the deployment assumptions.


## Implementation reference

Reviewed at `90267b20`. [execution_queue_v5.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/state/execution_queue_v5.rs) · [execution_queue_v5.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/execution_queue_v5.rs) · [execution_queue.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/execution_queue.rs) · [execution_queue_v5.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/accounts_ix/execution_queue_v5.rs). Source links require access to the implementation repository.
