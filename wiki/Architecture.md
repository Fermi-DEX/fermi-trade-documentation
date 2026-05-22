# System Architecture

Fermi-v1 separates the exchange into authority, sequencing, execution,
and observation layers.

This separation is the main architectural idea. The system can deliver a
fast user experience because off-chain services do useful work early, but
the final authority remains the on-chain program.

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
On-chain Fermi-v1 program
        |
        | events and state
        v
Continuum harness and fanout
```

## On-chain settlement program

The on-chain program is the exchange's source of truth. It owns the
state that matters economically:

- User collateral and account health.
- Perp positions and open orders.
- Order books and event queues.
- Funding accrual and fee accounting.
- Liquidation and bankruptcy handling.
- The execution queue that governs order sequencing.

When a trade settles, it settles here. When a margin check passes or
fails, it passes or fails here. When a liquidation changes an account,
that change happens here.

This is what makes the architecture non-custodial. Off-chain services can
help submit and observe transactions, but they do not maintain a hidden
ledger.

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

## Execution layer

Committed queue entries still need to be revealed. The executor performs
that work. It submits the full payload for the next queued sequence so
the on-chain program can verify it and run the matching path.

The executor is operationally important but not economically privileged.
It does not decide the contents of an order, and it does not settle
outside the program. It is a progress engine.

## Observation layer

The Continuum harness and fanout services make the system usable at
trading speed.

Continuum tracks confirmed chain state and also builds an optimistic view
that includes accepted, sequenced intents before they finalize. Fanout
distributes events to many users, UIs, and bots.

This layer is powerful for experience but powerless for settlement. If it
is wrong, users may see bad information temporarily, but the on-chain
program will not honor a view simply because the harness published it.

## Why this architecture works

The design works because each component has a narrow job:

- The program enforces rules.
- The relayer makes submission fast.
- The queue makes ordering auditable.
- The executor drives progress.
- Continuum makes state legible quickly.
- Fanout scales event delivery.

No off-chain component needs custody. No read layer needs authority. No
operator database becomes the balance sheet.

## Read the next pages

- [Order Lifecycle](Order-Lifecycle) explains the full path from signed
  order to confirmed fill.
- [Sequencer and Execution Queue](Sequencer-and-Execution-Queue)
  explains first-come, first-served ordering.
- [Optimistic Finality and Continuum](Optimistic-Finality-and-Continuum)
  explains how the system can feel fast before chain finality.
