# System Architecture

Fermi-v1 separates the exchange into on-chain execution, sequencing,
submission, and observation layers.

This separation is the main architectural idea. The system can deliver a
fast user experience because off-chain services do useful work early:
sequencing, pre-checking, submitting transactions, simulating expected
outcomes, and distributing state. The exchange itself still executes on
chain.

## Component map

```
Trader / SDK / UI / bot
        |
        | signed intent
        v
Relayer / sequencer
        |
        | hash commit and sequence
        v
On-chain execution queue
        |
        | reveal request
        v
Executor
        |
        | verified payload
        v
On-chain Fermi-v1 program executes matching, cancels, risk, and events
        |
        | events and state
        v
Continuum harness and fanout
```

## On-chain exchange program

The on-chain program is the exchange. It owns the state and logic that
matter economically:

- User collateral and account health.
- Perp positions and open orders.
- Order books and event queues.
- Order placement, matching, cancel, and consume-event paths.
- Funding accrual and fee accounting.
- Liquidation and bankruptcy handling.
- The execution queue that governs order sequencing.

When an order posts, it posts here. When a cancel removes an order, it is
removed here. When two orders match, they match here. When a margin check
passes or fails, it passes or fails here. When a liquidation changes an
account, that change happens here.

This is what makes the architecture fully on chain rather than merely
on-chain custody with off-chain matching. Off-chain services can help
sequence, submit, simulate, and observe transactions, but they do not run
the authoritative order book or matching engine.

## Sequencing layer

The sequencing layer decides the order in which same-market intents
enter the book. It is made of two parts:

- The relayer, which receives signed intents and assigns sequences.
- The on-chain execution queue, which records those sequences and enforces
  execution order.

The important distinction is that the relayer proposes order, while the
queue makes it public and enforceable. Once an intent hash and sequence
are committed, the relayer cannot silently rewrite that item into a
different order.

## Submission and execution layer

Committed queue entries still need to be revealed. The executor performs
that work. It submits the full payload for the next queued sequence so
the on-chain program can verify it and run the matching path.

The executor is operationally important but not economically privileged.
It does not decide the contents of an order, and it does not execute a
trade off chain. It is a transaction-submission worker that drives the
on-chain execution path.

## Observation layer

The Continuum harness and fanout services make the system usable at
trading speed.

Continuum tracks confirmed chain state and also builds an optimistic view
that includes accepted, sequenced intents before they finalize. That
optimistic view is non-binding. It is correct when it is correct because
the on-chain execution path is deterministic and the queued intent is
already bound by hash and sequence. Fanout distributes events to many
users, UIs, and bots.

This layer is powerful for experience but powerless for execution. If it
is wrong, users may see bad information temporarily, but the on-chain
program will not honor a view simply because the harness published it.

## Why this architecture works

The design works because each component has a narrow job:

- The program executes the exchange.
- The relayer makes submission fast.
- The queue makes ordering auditable.
- The executor drives progress.
- Continuum simulates and makes state legible quickly.
- Fanout scales event delivery.

No off-chain component needs custody. No read layer needs authority. No
operator database becomes the order book, matching engine, or balance
sheet.

## Read the next pages

- [Order Lifecycle](Order-Lifecycle) explains the full path from signed
  order to confirmed fill.
- [Sequencer and Execution Queue](Sequencer-and-Execution-Queue)
  explains first-come, first-served ordering.
- [Optimistic Finality and Continuum](Optimistic-Finality-and-Continuum)
  explains how the system can feel fast before chain finality.
