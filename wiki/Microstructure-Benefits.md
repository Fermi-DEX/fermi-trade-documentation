# Microstructure Benefits

Market microstructure is the set of rules that determines how orders
become trades. In a perp venue, microstructure affects spreads,
liquidity, execution quality, adverse selection, and user trust.

Fermi-v1's microstructure is built around three ideas:

- First-come, first-served sequencing.
- Price-time-priority matching.
- Fast optimistic feedback with on-chain settlement.

## First-come, first-served sequencing

Every market has a sequence. Earlier sequenced intents are ahead of later
intents in that market.

This gives traders a simple answer to a difficult question: why did this
order get priority?

On a venue with opaque internal ordering, users may have to trust the
operator's logs. On Fermi-v1, sequence state is part of the public
execution path.

## Reduced payload-based reordering

Commit/reveal reduces the opportunity to reorder after seeing order
contents.

The sequence is committed with a hash before the full payload is revealed
on chain. That means an order's place in line is fixed before public
payload visibility.

This is not a claim that all possible market manipulation disappears. It
is a narrower and more useful claim: same-market ordering is constrained
by a public mechanism rather than purely by an operator's discretion.

## Familiar price-time priority

The order book follows the standard price-time idea:

- Better prices trade first.
- At the same price, older orders trade first.

This is valuable because market makers already know how to reason about
that system. Queue position has economic meaning. Improving price has
economic meaning. Resting liquidity has a predictable priority model.

## Better conditions for market makers

Market makers quote tighter when they trust the venue's execution rules.
They widen spreads when they face hidden priority, unexplained fills, or
unbounded adverse selection.

Fermi-v1 helps by making several things more inspectable:

- Where an order sits in sequence.
- Whether the order was committed before reveal.
- How the book prioritizes resting orders.
- What events were emitted for fills and cancels.
- What final state was settled on chain.

That does not eliminate inventory risk or price risk, but it can reduce
uncertainty about the venue itself.

## Better experience for takers

Takers benefit from a venue where matching rules are understandable and
where order status is clear.

A taker can see that an order was accepted, sequenced, optimistically
processed, and then confirmed. If the order fails, expires, or is
dropped, that status can be traced rather than hidden behind a vague
"order rejected" message.

## More credible optimistic UX

Fast feedback is only useful if it is believable. Fermi-v1's optimistic
view is credible because it is based on deterministic matching and
committed queue state.

The venue can give users early feedback while still reconciling to
confirmed chain state. This is different from a purely off-chain matching
engine where the operator's database is both the fast path and the final
truth.

## Per-market throughput and isolation

Per-market queues make the system easier to scale and reason about. Heavy
activity in one market does not require every market to share the same
global ordering lane.

This improves practical liveness and monitoring. A problem can often be
localized to a market and sequence instead of becoming a mystery across
the whole exchange.

## The broader benefit

Fermi-v1's microstructure tries to make the venue itself less of a source
of uncertainty.

Traders will always face market risk. Market makers will always face
inventory and adverse-selection risk. The goal is to reduce unnecessary
venue risk: hidden ordering, unclear status, opaque settlement, and
operator-controlled finality.
