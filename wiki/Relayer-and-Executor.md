# Relayer and Executor

The relayer and executor are off-chain services that move orders from
signed user intent to on-chain execution.

They are operationally important, but they are intentionally limited.
They make the system fast and live; they do not become the exchange's
order book, matching engine, or ledger.

## The relayer's job

The relayer handles the front half of the order path.

It receives signed intents from users, validates obvious conditions,
assigns a sequence number, and commits intent hashes to the on-chain
execution queue.

The relayer gives users a fast submission path. Instead of every trader
constructing and broadcasting every queue transaction directly, the
relayer can batch, pre-check, and return a useful order status quickly.

## What the relayer can do

The relayer can:

- Accept or reject incoming intents.
- Run off-chain pre-checks.
- Assign the next sequence for a market.
- Commit hashes to the queue.
- Return sequence and status information to the user.
- Feed accepted intents into the optimistic read layer.

These are powerful operational roles. They determine the fast-path user
experience.

## What the relayer cannot do

The relayer cannot:

- Move user funds.
- Create a fill without on-chain execution.
- Change the signed order after the user submits it.
- Execute a different payload for the same committed hash.
- Replay a consumed intent successfully.
- Make the harness's optimistic view final.

The relayer's authority ends at sequencing and submission. Execution
still belongs to the program.

## The executor's job

The executor handles the transaction-submission half of the order path.

After the relayer commits hashes, the executor reveals the payloads in
queue order. It builds the on-chain transaction that supplies the full
intent and asks the program to execute it.

The executor is sometimes called a crank because it turns pending queue
state into on-chain progress. Without an executor, committed intents
would remain queued instead of reaching the on-chain matching, placement,
cancel, or reject path.

## What the executor can do

The executor can:

- Observe committed queue items.
- Submit reveals for queued intents.
- Retry eligible items.
- Help clear expired or invalid items through recovery paths.
- Keep the market moving when there is queued work.

## What the executor cannot do

The executor cannot change the order payload without failing
verification. It also cannot skip around the queue for convenience. The
on-chain program checks that the revealed payload matches the committed
hash and that execution proceeds according to the queue's rules.

If an executor disappears, the system loses a progress worker, not the
market's source of truth. Other parties can submit execution
transactions, and recovery paths exist for stuck items.

## Why split relayer and executor?

The split clarifies the lifecycle.

The relayer answers: "What has been accepted and where is it in line?"

The executor answers: "What queued item is now being revealed for
on-chain execution?"

Combining both roles in one operator service can be efficient, but the
conceptual separation is important. Admission, ordering, reveal
submission, and on-chain execution are different concerns.

## Operator trust boundary

Users depend on the operator for quality of service. A poor relayer can
delay, reject, or fail to provide fast-path access. A poor executor can
increase the time between commit and on-chain execution.

But those failures do not give the operator a blank check over balances,
the order book, or matching history. The operator can degrade service; it
cannot make an unauthorized execution final.

That boundary is the reason Fermi-v1 can use off-chain services without
turning into a conventional custodial exchange.
