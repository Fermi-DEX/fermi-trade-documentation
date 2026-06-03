---
title: Welcome to Fermi Trade
description: What Fermi Trade is and what makes it different
---

# Welcome to Fermi Trade

Fermi Trade is a **non-custodial, fully on-chain perpetual-futures
exchange** built on Solana. You keep custody of your collateral, you
sign every order yourself, and every fill, funding payment, and
liquidation executes on the public ledger.

There is no off-chain matching engine deciding your fills, no
off-chain risk database holding your margin, and no escrow account
holding your funds. A single on-chain program owns the order book,
the cross-margin risk engine, funding, and liquidation — and it is
the only thing that can move value.

## What you get

- **Cross-collateral perps.** Deposit USDC, SOL, ETH, BTC and other
  supported tokens; a single account backs positions across every
  market. Your risk is one signed-USD health number.
- **A real on-chain order book.** Strict price-time priority, the same
  model a professional venue uses — but verifiable by anyone.
- **Fair ordering you can audit.** Orders are sequenced by
  [POSq](../30-posq-sequencing.md) over encrypted VDF ticks, then locked
  on chain before they execute. In v1, POSq runs in single-sequencer
  mode, so reordering is detectable rather than hidden in a black box;
  v2 adds voting, leader rotation, and permissionless participation.
- **Centralized-exchange responsiveness.** An optimistic read layer
  shows your fills in milliseconds, while on-chain finality follows a
  beat behind.
- **Self-custody at all times.** Your account is an address only your
  signature can mutate. If every off-chain service vanished, your
  funds would be exactly where the chain says they are.

## How the pieces fit

At the center is the on-chain program — the single source of truth.
Around it sit a small number of unprivileged services that make the
program **fast to use** and **fast to watch**: a sequencing layer that
orders incoming intents fairly, and a read layer that streams
optimistic and confirmed state to your screen.

The important property is that none of those services can betray you.
They have no custody and no power to change a fill. They exist purely
for speed and convenience.

To understand the design, read [Architecture](04-architecture.md). To
start trading, go to [Getting Started](02-getting-started.md).

## Availability

Fermi Trade is non-custodial and permissionless to interact with at
the protocol level. Front-end access and supported jurisdictions may
be restricted; check the app for current terms. Perpetual futures are
high-risk instruments — read the [Risk Warning](24-risk-warning.md)
before trading.
