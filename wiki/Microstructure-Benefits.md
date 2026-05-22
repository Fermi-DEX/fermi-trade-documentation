# Microstructure Benefits

Fermi-v1's market microstructure is built around a per-market
first-come-first-served execution queue and a price-time-priority order
book.

## First-come-first-served sequencing

Each market has its own sequence. Earlier queued orders execute before
later queued orders in that same market.

This makes priority easier to audit and gives market participants a
clearer view of where they stand in line.

## Commit before reveal

The relayer commits a hash before the full order payload is revealed.
That means order priority is locked before order details become public on
chain.

This reduces same-market payload-based reordering and makes the
fairness claim mechanical rather than discretionary.

## Price-time priority

Better prices trade first. At the same price, older orders trade first.

This is the standard model many market makers expect, and it supports
more predictable liquidity provision.

## Deterministic matching

The matcher is deterministic. The same book, oracle inputs, and intent
should produce the same result for independent observers.

This is what allows the optimistic read layer to give useful early
feedback without becoming the settlement authority.

## Benefits for liquidity

The design can improve quoting conditions because makers can reason about
queue position, priority, event trails, and settlement rules. Better
confidence can support tighter spreads and deeper books, though it does
not remove market or inventory risk.
