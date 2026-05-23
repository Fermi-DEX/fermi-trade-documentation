# Order Lifecycle

An order in Fermi-v1 passes through several stages. Each stage has a
different purpose: user authorization, sequencing, visibility, on-chain
execution, confirmation, and reconciliation.

The lifecycle is important because it explains how Fermi-v1 can provide
fast feedback without making the off-chain path executable or final.

## Stage 1: The user signs an intent

The user does not send an informal instruction like "buy SOL." The user
signs an intent: a structured order payload and the account list needed
to execute it.

That signature matters because it binds the user's authorization to the
order. A later service can carry the intent forward, but it cannot change
the order without invalidating the signed material.

What this achieves:

- The user authorizes exactly what they mean to do.
- The relayer does not get discretionary trading authority.
- The on-chain program can verify that the revealed payload is the
  user's payload.

## Stage 2: The relayer accepts and pre-checks

The relayer receives the signed intent and performs fast checks before
spending on-chain resources.

These checks can include signature shape, account freshness, oracle
freshness, risk pre-checks, reduce-only behavior, and basic request
validity.

This is a convenience and latency feature, not the ultimate security
boundary. The same kind of checks still matter on chain when the order is
actually executed.

What this achieves:

- Users get fast rejection for clearly invalid orders.
- The chain is spared avoidable failed transactions.
- Bots and UIs get a cleaner order-submission loop.

## Stage 3: The relayer assigns a market sequence

If the intent is accepted, the relayer assigns a sequence number for that
market. The sequence represents where the order stands in that market's
line.

This is the beginning of the fairness mechanism. The sequence is not just
an internal number in an operator database. It is committed to the
on-chain execution queue.

What this achieves:

- Same-market priority becomes visible.
- Traders can trace order status by market and sequence.
- Later execution is constrained by the committed ordering.

## Stage 4: The relayer commits the intent hash

The relayer does not immediately reveal the entire order. It first
commits a hash of the intent to the on-chain queue.

This locks the relationship between sequence and payload while hiding the
payload contents until reveal.

What this achieves:

- Ordering is fixed before order details become public on chain.
- The payload cannot be changed later without a hash mismatch.
- A signed intent cannot be substituted for a different intent at reveal.

## Stage 5: The optimistic view updates

Once an intent is accepted and sequenced, the Continuum harness can show
an optimistic update. It can tell the trader that the order is accepted,
where it sits, and what the deterministic matcher predicts.

This is not execution. It is an early, useful prediction from a read layer
that mirrors the exchange state.

What this achieves:

- UIs feel responsive.
- Bots can react to accepted state without waiting for finality.
- Users get near-real-time order status.

## Stage 6: The executor reveals the payload

The executor takes the next committed queue item and submits the full
payload to the on-chain program.

The program recomputes the hash, checks that it matches the committed
hash, verifies the user signature, checks replay protection, and then
runs the order through the proper handler.

What this achieves:

- The queue entry becomes an executable order.
- The program confirms that the order is exactly what was committed.
- Execution remains tied to the user's signature.

## Stage 7: The on-chain program executes

The on-chain program performs the actual market action. Depending on the
order and the book, the order may fill, post, partially fill and post,
cancel the remainder, or reject.

The program also applies risk checks, updates relevant state, and emits
events for fills and book changes.

What this achieves:

- Matching, placement, cancels, fills, and account changes happen in
  public program state.
- Fills and account changes are not operator-side records.
- Events become the basis for reconciliation.

## Stage 8: Confirmed state catches up

After the transaction confirms, Continuum's confirmed view catches up
with the earlier optimistic view. If the optimistic prediction was
correct, the trader experiences the confirmation as reconciliation rather
than new information.

If something changed between optimism and confirmation, the confirmed
on-chain execution result wins.

What this achieves:

- Traders get low-latency feedback.
- Final state stays anchored to the chain.
- Integrators can separate optimistic state from confirmed state.

## Why the lifecycle matters

The lifecycle gives Fermi-v1 three properties at once:

- Speed: accepted intents are visible before finality.
- Fairness: same-market order is committed before reveal.
- Execution integrity: final state is produced by the on-chain program.

That combination is the main difference between Fermi-v1 and a venue
whose speed comes from an opaque off-chain matching database.
