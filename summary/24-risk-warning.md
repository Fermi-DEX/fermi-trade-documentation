---
title: Risk Warning
description: What can go wrong, what cannot, and what is your responsibility
---

# Risk Warning

Perpetual futures are high-risk instruments. Trading them with leverage
can lead to the **total loss** of your collateral, and in extreme cases
to losses borne collectively by depositors. Read this page before
trading.

## Market and leverage risk

- **Leverage amplifies losses as well as gains.** A small adverse move
  can wipe out a leveraged position.
- **You can be liquidated.** If your maintenance health goes negative,
  anyone can reduce your position at a discount, and you pay the
  liquidation fees. See [Liquidations](22-liquidations.md).
- **Funding is an ongoing cost or credit.** Holding a position accrues
  funding continuously, which can erode a position over time. See
  [Funding](14-funding.md).

## System and market-structure risk

- **Oracle dependence.** Valuation relies on external oracles. If an
  oracle is stale or its confidence is too wide, the affected market
  pauses by design — you may be temporarily unable to trade or exit
  that market.
- **Socialized loss.** In an extreme, exchange-wide event, a shortfall
  that exceeds the insurance fund can be socialized across depositors
  of the affected token as a small proportional haircut. See
  [Bankruptcy & Insurance Fund](23-bankruptcy-and-insurance.md).
- **Smart-contract risk.** The on-chain program is the authority. It is
  open and audited, but as with any software, residual risk exists.
- **Solana network conditions.** Congestion can raise confirmation
  latency. The optimistic view continues to serve, and per-market
  isolation limits blast radius, but on-chain finality can slow.

## What the design protects against

The architecture is specifically built so that certain failures
*cannot* harm you:

- No off-chain party can move your funds — you self-custody at all
  times.
- No party can reorder same-market orders after they're locked, edit
  your order, replay it, or front-run your pending flow. See
  [FCFS Ordering](06-fcfs-ordering.md).
- If every off-chain service failed, your funds would remain exactly
  where the chain says, and you could still act via the
  [on-chain submission path](25-direct-onchain-submission.md).

## Your responsibilities

- **Manage your health.** Keep a buffer above the maintenance line and
  monitor your account.
- **Set caps and use reduce-only.** Always cap market orders, and use
  reduce-only for stops so you can't accidentally flip a position.
- **Reconcile against confirmed state.** Treat optimistic readings as
  predictions; reconcile final PnL and balances against confirmed
  on-chain state.
- **Secure your keys.** Self-custody means key loss is your loss. Use
  delegation for bots so your withdrawal keys stay cold.

Nothing in this documentation is financial advice. Only trade with what
you can afford to lose.
