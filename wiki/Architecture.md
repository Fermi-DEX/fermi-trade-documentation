# Architecture

Fermi-v1 has four main parts:

- The on-chain settlement program.
- The relayer.
- The executor.
- The Continuum harness and fanout layer.

## On-chain settlement program

The Solana program is the source of truth. It owns collateral, perp
markets, order books, margin, funding, fees, liquidation, bankruptcy
handling, and the execution queue.

Every value-changing action is settled by this program.

## Relayer

The relayer receives signed order intents, validates them off chain,
assigns a market sequence, and commits a hash of each intent to the
on-chain queue.

It can provide speed and batching. It cannot move funds or alter a signed
payload after commit.

## Executor

The executor reveals queued intents to the on-chain program. The program
checks the hash, verifies the user signature, checks replay protection,
and runs the order through the matching engine.

## Continuum harness and fanout

The harness mirrors chain state and produces a low-latency optimistic
view. Fanout distributes events to many clients.

Neither component can change settlement. They are read and distribution
layers.

## Order lifecycle

1. Trader signs an order intent.
2. Relayer validates and assigns a sequence.
3. Relayer commits the intent hash on chain.
4. Harness shows the accepted intent optimistically.
5. Executor reveals the full payload.
6. On-chain program verifies and executes.
7. Events are emitted and streamed.
8. Confirmed state reconciles with the optimistic view.
