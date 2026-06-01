---
title: Accounts
description: How Fermi accounts, sub-accounts, and delegation work
---

# Accounts

A **Fermi account** is the per-trader address that holds your spot
collateral, your perp positions, and your open orders. Everything you
do on Fermi flows through one (or more) of these accounts.

## An account you own

A Fermi account is derived deterministically from your wallet, so its
address follows from who you are — you don't have to remember it. Only
your signature (or a delegate you explicitly authorize) can change it.
No operator and no off-chain service can move its funds.

## Cross-margin within an account

Within a single Fermi account, **all positions cross-collateralize**.
Every deposit backs every position, and your risk is summarized as one
signed-USD [health](20-margin-and-health.md) number. There is no
isolated-margin mode inside a single account — if you want isolation,
use a separate sub-account.

## Sub-accounts

You can open multiple independent accounts under the same wallet, each
with its own health that liquidates independently. Common patterns:

- **Strategy isolation** — keep a directional book separate from a
  market-making book.
- **Risk caps** — cap the downside of an experimental strategy by
  funding it in its own sub-account.
- **Bot vs. manual** — run a delegated, bot-controlled account
  alongside your manual trading account.

## Delegation

You can authorize a **delegate** — typically a hot wallet — to operate
an account without ever touching your main authority key. A delegate
can place and cancel orders, settle PnL, and settle funding. A
delegate **cannot** withdraw funds, change the delegate or owner, or
close the account. This lets a trading bot run continuously while your
withdrawal keys stay cold.

## What an account holds

- **Token positions** — your collateral balances (and any borrows),
  one slot per token. Balances are interest-bearing and grow
  implicitly as interest accrues; you never have to "claim" it.
- **Perp positions** — your open exposure per market, with the
  bookkeeping that tracks entry price, funding, and realized PnL.
- **Open orders** — your resting orders across markets.

Accounts start with room for a handful of tokens, perp positions, and
open orders, and can be **expanded** once if you need more slots (for
example, a market maker quoting many price levels). Expansion is a
one-time step and cannot be reversed.

## Health regions

Some operations (such as the reveal-and-execute step, or a flash loan)
wrap several actions together and allow the account to be *transiently*
below zero health mid-transaction, as long as it ends solvent.
Liquidators cannot act on that transient state — only the committed
result after the operation finishes matters.

## Closing an account

You can close a Fermi account and recover its rent once it is fully
wound down: all balances at zero, all positions closed and
deactivated, no open orders, and not currently being liquidated.
