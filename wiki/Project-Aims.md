# Project Aims

Fermi-v1 is designed to make a high-performance perpetual futures market
without moving the market's authority off chain.

The project aims to provide:

- Self-custody through on-chain settlement.
- Fairer same-market ordering through a public first-come-first-served
  queue.
- Familiar order-book behavior through price-time priority.
- Fast user feedback through optimistic reads.
- Resilience when off-chain services degrade.

The core idea is separation of concerns. The chain owns the rules and
state. Off-chain services improve speed and visibility, but they do not
own custody or final settlement.

## Why this matters

Centralized exchanges are fast, but users trust the operator with custody
and matching. Naive on-chain markets are transparent, but often feel too
slow for active trading. Fermi-v1 is designed to keep on-chain authority
while making the trading loop responsive enough for professional use.

## Intended audiences

Traders get self-custody and an auditable order path.

Market makers get deterministic priority rules and clearer queue
position.

Integrators get APIs and streams while retaining an on-chain source of
truth.

Evaluators get a concrete trust boundary between the program and the
operator-run services.
