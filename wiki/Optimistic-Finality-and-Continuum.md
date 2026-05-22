# Optimistic Finality and Continuum

Optimistic finality is the part of Fermi-v1 that makes the system feel
fast before the chain has finished confirming everything.

The phrase does not mean that the off-chain view is final in a legal or
settlement sense. It means that the system can provide a high-confidence,
low-latency prediction of what a sequenced order will do, then reconcile
that prediction against confirmed chain state.

## The latency problem

Traders do not want to wait through a full finality cycle before seeing
whether an order was accepted, where it sits, or what it likely did
against the book.

Market makers especially need short feedback loops. If quoting is slow,
spreads widen, inventory management gets harder, and the venue becomes
less attractive.

Purely on-chain interaction often struggles here because the UI only
knows what happened after a transaction lands. Fermi-v1 adds an
optimistic read layer so users can see useful state earlier.

## What Continuum does

The Continuum harness maintains a mirror of market state and publishes
state over APIs and streams.

It can show two categories of state:

Confirmed state: What has already settled on chain.

Optimistic state: Confirmed state plus accepted, sequenced intents that
are expected to execute soon.

The optimistic view is useful because the on-chain matching logic is
deterministic. If Continuum has the same relevant inputs, it can preplay
the intent and predict the result before the final transaction confirms.

## Why optimism is credible

Optimism is credible when four things are true:

1. The order has been accepted and sequenced.
2. The committed hash binds the future reveal to the accepted payload.
3. The matcher is deterministic.
4. The system clearly distinguishes optimistic state from confirmed
   state.

Fermi-v1 is designed around those conditions. The optimistic view is not
just a UI guess. It is a simulation of the same deterministic path the
chain is expected to run, constrained by committed queue state.

## What optimism achieves

For traders:

- Faster acknowledgement.
- Earlier fill and post predictions.
- More responsive account and order views.
- Better ability to react to changing market conditions.

For market makers:

- Faster quote management.
- Less need to wait for finality after every submission.
- Better visibility into pending state.

For integrators:

- A clean distinction between accepted, optimistic, and confirmed events.
- Streams that can power dashboards, bots, and reconciliation systems.
- A path to build responsive products while still checking chain truth.

## What optimism does not mean

Optimistic finality is not the same as final settlement.

An optimistic fill is not a final fill until the on-chain transaction
settles. A good interface should communicate status clearly: accepted,
optimistic, confirmed, rejected, expired, or dropped.

The confirmed view always wins. If an oracle update, account condition,
transaction failure, or queue recovery changes the outcome, clients must
reconcile to the confirmed state.

## Fanout and scaling reads

Continuum is the core read and simulation layer. Fanout is the
distribution layer in front of event streams.

Fanout exists because many users may want the same fills, book deltas,
account updates, or order status events. Broadcasting from a scalable
fanout layer keeps the core harness from becoming the bottleneck for
every subscriber.

Fanout does not create truth. It distributes observations.

## The practical user experience

In a well-functioning market, the user sees:

1. Order submitted.
2. Order accepted and sequenced.
3. Optimistic book/account update.
4. Confirmed fill or order status.

The interaction feels similar to a centralized exchange, but the final
settlement path is still on chain.
