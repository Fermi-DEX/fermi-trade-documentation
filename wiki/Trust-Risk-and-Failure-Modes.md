# Trust, Risk, and Failure Modes

Fermi-v1's trust model is based on a simple principle: the on-chain
program is authoritative, while off-chain services are helpful but
limited.

That does not mean there is no trust. It means trust is scoped. Users
trust the deployed program for settlement and risk rules. They rely on
operators for service quality, latency, and availability.

## Component powers

| Component | Can do | Cannot do |
|---|---|---|
| On-chain program | Settle trades, enforce matching, compute health, update balances, run liquidation. | Act outside deployed code. |
| Relayer | Accept intents, pre-check requests, assign market sequences, commit hashes. | Move funds, alter signed payloads, settle fake fills. |
| Execution queue | Lock ordering and constrain reveal order. | Guarantee that a relayer accepts every user. |
| Executor | Reveal queued payloads and drive progress. | Change the committed payload or bypass program checks. |
| Continuum harness | Mirror state, simulate optimistic outcomes, serve APIs. | Make optimistic state final. |
| Fanout | Broadcast events to many clients. | Create settlement events or alter chain state. |
| Trader | Sign orders, manage collateral, cancel, withdraw, liquidate when eligible. | Mutate another user's account without authorization. |

## Main trust assumptions

### Program correctness

The largest technical trust assumption is that the on-chain program is
correct. Bugs in matching, health, settlement, liquidation, funding, or
accounting can have direct economic consequences.

### Oracle correctness and availability

Perp risk depends on oracle data. If oracle data is stale, wrong, or
unavailable, markets can reject actions, pause, or produce poor outcomes.

### Operator availability

Users rely on the relayer, executor, Continuum, and fanout for the best
experience. If those services degrade, trading can become slower or less
convenient.

### Chain availability

Final settlement depends on Solana transaction processing. Congestion,
priority fee dynamics, or RPC issues can affect confirmation latency.

## Failure modes

### Relayer unavailable

Fast-path submission may fail or slow down.

Mitigation: users can use the direct fallback path. Existing on-chain
state remains valid.

### Relayer refuses service

A user may not get fast-path access.

Mitigation: direct submission reduces dependence on the relayer as the
only gateway.

### Executor stalled

Committed intents may wait longer before reveal.

Mitigation: execution can be run by other parties, and recovery logic can
advance past expired or invalid items.

### Continuum unavailable

Optimistic state and convenient APIs may be unavailable.

Mitigation: confirmed chain state still exists. Trading may be less
ergonomic, but settlement is not rewritten.

### Fanout unavailable

Streams may be delayed or disconnected.

Mitigation: clients can reconnect, poll, or read from other surfaces.

### Oracle stale

Risk checks or market actions may reject until fresh data is available.

Mitigation: fresh oracle updates restore normal operation, depending on
market conditions.

### Solana congestion

Confirmation latency can rise.

Mitigation: optimistic views can soften the user-experience impact, but
they do not remove the need for final on-chain settlement.

## What the system deliberately does not promise

Fermi-v1 does not promise:

- No liquidations.
- Guaranteed liquidity.
- Zero slippage.
- Perfect oracle behavior.
- Instant finality.
- Immunity from all MEV or all adverse selection.
- No smart contract risk.

The promise is narrower: custody and final settlement live in public
program state, same-market ordering is mechanically constrained, and
off-chain services do not become the exchange's hidden authority.

## Practical evaluation checklist

When evaluating Fermi-v1, ask:

- Can I identify the authoritative state for balances and positions?
- Can I trace an order from submission to sequence to execution?
- Can I distinguish optimistic state from confirmed state?
- What happens if the relayer is unavailable?
- What happens if the executor stalls?
- Can my integration reconcile against chain state?
- Do the market's priority rules make sense for my trading strategy?

Those questions map directly to the architecture. The system is designed
to make the answers visible rather than implicit.
