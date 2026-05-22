---
title: Trust, Risk, and Failure Modes
---

# Trust, Risk, and Failure Modes

[Home](index.md) | [Aims](aims.md) | [Architecture](architecture.md) |
[Microstructure](microstructure-benefits.md) | [Trust and Risk](trust-risk-failure.md)

Fermi-v1's trust model is easiest to understand by asking what each
component can do.

## What users trust

Users primarily trust the deployed on-chain program. That program defines
custody, matching, margin, funding, liquidation, and queue behavior.

Users also rely on off-chain services for speed and convenience, but
those services are deliberately limited. They can delay, refuse, or show
bad information for a short time. They cannot settle a fake fill, move
funds, or change a signed order after the fact.

## Component powers

| Component | Can do | Cannot do |
|---|---|---|
| On-chain program | Enforce settlement, matching, risk, funding, liquidation, and queue rules. | Act outside deployed code. |
| Relayer | Accept intents, pre-check them, assign sequences, commit hashes. | Move funds, alter signed payloads, replay consumed intents, reorder after commit. |
| Executor | Reveal committed intents and drive execution. | Change the payload without failing hash checks. |
| Harness | Mirror state, simulate optimistic outcomes, serve APIs and streams. | Change on-chain state or force settlement. |
| Fanout | Broadcast events to many clients. | Create events or settle trades. |
| Trader | Sign orders, manage collateral, place and cancel orders. | Mutate another user's account without authorization. |

## Main risks

### Smart contract risk

The on-chain program is the authority. A program bug can affect funds,
matching, health, liquidation, or accounting. This is the central
technical risk in any non-custodial exchange.

### Oracle risk

Perp markets depend on oracle prices for health, funding, and risk
checks. Stale, incorrect, or unavailable oracle data can pause actions or
produce bad risk outcomes.

### Liquidity risk

Self-custody does not guarantee liquidity. Thin books, fast markets, and
wide spreads can still cause slippage, partial fills, or liquidation.

### Latency and congestion risk

The optimistic view can feel fast, but finality still depends on Solana
transactions. Network congestion, priority fees, or service outages can
increase confirmation latency.

### Relayer availability risk

If the relayer is unavailable, the fast path is degraded. The direct
fallback path exists so the relayer is not the only way to reach the
queue.

## Failure behavior

| Failure | User-facing effect | Mitigation |
|---|---|---|
| Relayer down | Fast-path order submission may fail. | Direct fallback path. |
| Executor down | Committed orders may wait longer to reveal. | Anyone can crank execution; recovery can advance stuck queue items. |
| Harness down | Optimistic view and APIs may be unavailable. | Confirmed state remains on chain. |
| Fanout down | Streams may be delayed or missing. | Poll harness or chain directly. |
| Oracle stale | Affected actions may reject or pause. | Fresh oracle updates restore normal checks. |
| Solana congestion | Confirmation latency rises. | Priority fees and optimistic reads reduce, but do not eliminate, the impact. |

## What the design does not promise

Fermi-v1 does not promise risk-free leverage, guaranteed liquidity,
perfect oracle behavior, or zero latency. It also does not remove all
forms of market risk.

The promise is narrower and more concrete: custody and settlement live in
public on-chain code, order sequencing is mechanically verifiable, and
off-chain speed services are useful without becoming the exchange's
ultimate authority.
