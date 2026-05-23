# Project Aims

Fermi-v1 is built around a specific thesis: a perpetual futures exchange
can feel fast without giving an operator custody over funds or unchecked
control over matching.

The goal is not simply to put collateral accounting on chain. The goal is
to run the exchange on chain: order placement, cancels, matching, book
updates, fills, funding, margin, and liquidation. Speed comes from
sequencing assistance and non-binding simulation, not from moving
execution into a private matching engine.

## What the project aims to achieve

### Fully on-chain derivatives execution

Users keep control of collateral through on-chain accounts, and the
market itself also runs on chain. Deposits, withdrawals, order placement,
cancels, matching, positions, funding, fills, liquidation, and bankruptcy
handling are all handled by the deployed program.

The operator can run useful services, but the operator does not maintain
the canonical order book, matching engine, or balance sheet.

### Verifiable same-market ordering

Fermi-v1 uses a per-market execution queue. Orders are assigned a
sequence before they reach the book. The sequence is committed on chain,
and on-chain execution proceeds through that sequence.

This turns "trust us, we matched fairly" into a property that users can
inspect by market and sequence number.

### Fast feedback without off-chain execution

Active traders need quick feedback. A system that only updates the UI
after finality is usually too slow for market making and tactical
trading.

Fermi-v1 addresses this through the Continuum harness. It mirrors state,
tracks accepted intents, and shows an optimistic view of what should
happen before finality. That view is useful because the on-chain matcher
is deterministic, but it is still only a view. The actual placement,
cancel, match, fill, and risk update remain on chain.

### Familiar market structure for liquidity providers

Market makers understand price-time priority, queue position, maker and
taker behavior, cancels, posted liquidity, and adverse selection. Fermi-v1
keeps that mental model instead of replacing it with an opaque auction or
operator-managed internalization layer.

### Graceful degradation

The system is designed so that off-chain components can degrade without
changing who owns funds, where the book lives, or what counts as
authoritative execution.

If the relayer is unavailable, users can use the direct fallback path. If
the harness is unavailable, confirmed chain state still exists. If an
executor stalls, recovery paths can move the queue forward.

## Why these aims matter

Perpetual futures markets are latency-sensitive and risk-sensitive. A
venue has to do several things at once:

1. Admit and order requests quickly.
2. Keep market data current enough for trading.
3. Enforce risk checks before new exposure is opened.
4. Produce reliable fills and event records.
5. Keep custody, matching, execution, and accounting transparent.

Centralized venues usually optimize the first two by making the operator
the source of truth. Fermi-v1 takes a different path: the operator can
accelerate the experience, and can provide sequencing and simulation, but
the source of truth for execution remains the on-chain program.

## What success looks like

For a trader, success means fast acknowledgement, clear order status, and
confidence that execution is not an operator promise.

For a market maker, success means being able to quote against a
predictable queue, understand priority, and reconcile fills from public
events.

For an integrator, success means APIs and streams that are fast enough for
production workflows while remaining reconcilable against chain state.

For an evaluator, success means a narrow trust model: each service has a
clear role, clear limits, and a clear failure mode.
