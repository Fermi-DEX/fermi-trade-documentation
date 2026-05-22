# Market Data and Integration Surfaces

Fermi-v1 is meant to be integrated by UIs, bots, market makers,
liquidators, indexers, and monitoring systems. Those users need different
views of the same exchange.

The integration surface is therefore split into submission, streaming,
state reading, and reconciliation.

## Submission surfaces

The fast path is the relayer. A client signs an intent and submits it to
the relayer, which pre-checks, sequences, and commits it.

The direct path is the fallback. If the relayer is unavailable or refuses
service, users can still submit through the on-chain path, accepting a
less convenient workflow in exchange for censorship resistance.

This dual path is central to the trust model. Fast service is useful, but
market access should not be entirely dependent on one off-chain service.

## Read surfaces

Clients need to read:

- Market metadata.
- Order books.
- Account state.
- Open orders.
- Fills and book events.
- Funding and oracle-related state.
- Queue status and order traces.

Some reads are best served from chain state. Others are best served from
Continuum because users need low-latency, aggregated, or optimistic
state.

## Event streams

Event streams are what make the venue usable in real time. A trader or
bot wants to know when an order is accepted, posted, filled, canceled,
expired, dropped, or rejected.

Fanout exists so many subscribers can receive those updates without each
one polling the core services or RPC nodes independently.

## Optimistic versus confirmed data

Integrators should treat optimistic data and confirmed data as separate
states.

Optimistic data is useful for responsiveness. It can drive a UI, a quote
manager, or an order monitor.

Confirmed data is the reconciliation target. It is what accounting,
balance displays, and risk dashboards should ultimately settle against.

Good integrations expose this distinction instead of hiding it.

## Order tracing

Because Fermi-v1 assigns market sequences, clients can trace an order by
market and sequence. This is useful for support, monitoring, and
automated systems.

A clear trace can answer:

- Was the order accepted?
- What sequence did it receive?
- Was the hash committed?
- Was the payload revealed?
- Did execution succeed?
- If not, did it expire, fail, or get dropped?

This turns many "where is my order?" problems into observable state
queries.

## Integration mindset

The best way to integrate with Fermi-v1 is to use the fast surfaces for
workflow and the confirmed surfaces for accounting.

That means:

- Submit through the relayer when available.
- Subscribe to streams for responsiveness.
- Use optimistic state for early UX.
- Reconcile to confirmed state.
- Keep fallback paths for relayer or stream outages.

This mirrors the architecture of the exchange itself: speed where it is
useful, chain truth where it matters.
