# Price-time priority on the order book

The book selects the best eligible price first. For equally priced resting orders, insertion order determines priority. This is distinct from the AMQ, which orders incoming actions before they reach the book.

Each market has a bids account and an asks account. Each side contains fixed-price and oracle-pegged trees. The iterator merges their eligible orders using effective prices. An oracle-pegged order's effective price changes with the reference; its offset and peg limit still constrain execution.

## How time priority is encoded

The market increments a book sequence when generating an order ID. Its key combines price data with the sequence. Bid keys invert the sequence portion because the bid tree is traversed in descending order; ask keys retain it for ascending order. Earlier orders therefore retain priority at the same price within the ordering rules.

This sequence is assigned by the on-chain matching path. It is not the relayer's ingress timestamp or the v5 AMQ sequence.

## Example

Alice rests an ask for 2 units at $100. Bob later rests an ask for 3 at $100. A buy for 4 at a $100 limit takes Alice's 2, then 2 from Bob. If Carol has an eligible ask at $99, that better price trades first even if Carol posted later.

A cancellation arriving after the buy in the same admitted market sequence cannot jump ahead of it. Conversely, a cancellation resolved first removes the eligible resting order before the later buy matches it.

## Eligibility and finite capacity

Expired and invalid pegged orders are excluded from matching and may be removed through bounded cleanup work. Matching has a compute-bound iteration limit. Book storage is finite; posting can involve expiry cleanup or eviction rules when full. A price-time policy does not guarantee that an arbitrarily large request completes in one instruction.

Use [matching outcomes](11-matching-engine.md) to distinguish an accepted request, a posted order, a partial fill and a completed fill.


## Implementation reference

Reviewed at `90267b20`. [nodes.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [bookside.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [book.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs). Source links require access to the implementation repository.
