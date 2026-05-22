# Sequencer and Execution Queue

The sequencer is the part of the system that decides "who is next" for a
market. In Fermi-v1, sequencing is deliberately split between an
off-chain relayer and an on-chain execution queue.

The relayer makes sequencing fast. The execution queue makes sequencing
auditable and enforceable.

## What sequencing achieves

Sequencing solves a core market problem: if two users submit orders to
the same market, the venue needs a rule for which order reaches the book
first.

Without a clear rule, users face several risks:

- An operator can reorder requests after seeing their contents.
- A validator can try to extract value by changing transaction order.
- A market maker cannot reason cleanly about queue position.
- A trader cannot audit why a later order traded before an earlier one.

Fermi-v1's answer is a per-market first-come, first-served sequence.

## Per-market ordering

Each market has its own ordering lane. SOL-PERP, ETH-PERP, and BTC-PERP
do not need to share one global queue.

This matters because markets have different activity patterns. A busy
market should not unnecessarily block unrelated markets. Per-market
sequencing also makes operational diagnosis cleaner: if a sequence is
stuck, the affected market and sequence are explicit.

## Commit before reveal

The queue uses a commit/reveal pattern.

First, the relayer commits a hash and sequence. At this point the order's
position is locked, but the full payload is not public on chain.

Later, the executor reveals the payload. The on-chain program recomputes
the hash and verifies that the payload matches the committed hash.

This achieves two things:

- The order cannot be changed after it has a queue position.
- The order's contents are not revealed before the queue position is
  locked.

That is the key fairness property. Sequencing happens before public
payload visibility.

## What the queue prevents

The queue is meant to prevent several classes of abuse:

Payload substitution: A relayer cannot commit one thing and reveal a
different thing without failing the hash check.

Same-market reordering after commit: Once the market sequence is on
chain, later execution has to respect the sequence.

Replay: A consumed intent cannot be executed again as though it were a
new order.

Silent status ambiguity: Because items have sequence numbers and events,
users can trace what happened to an order.

## What the queue does not prevent

The queue does not guarantee that every user gets perfect service from
the relayer. A relayer can still refuse to accept an order or be
unavailable. That is a censorship and availability problem, not a
settlement rewrite problem.

Fermi-v1 addresses this with a direct fallback path so users are not
completely dependent on the fast path.

The queue also does not remove market risk. Being first in line does not
guarantee a favorable price, a complete fill, or freedom from liquidation
risk.

## How users experience the sequencer

From a trader's perspective, the useful output is a clear order status:

- Accepted by the relayer.
- Assigned to a market sequence.
- Committed on chain.
- Optimistically reflected in the read layer.
- Revealed and executed.
- Confirmed, dropped, expired, or rejected with a reason.

From a market maker's perspective, the useful output is a more
predictable priority model. Queue position is not a hidden operator-side
claim. It is tied to public sequence state.

## Why this is different from a normal off-chain sequencer

Many systems have a sequencer. The distinction in Fermi-v1 is that the
sequencer's work is bound into an on-chain queue before execution.

The relayer can make ordering decisions at admission time. It cannot then
secretly reinterpret those decisions once order contents and market
conditions are known.

That is the design goal: fast admission, public ordering, deterministic
execution.
