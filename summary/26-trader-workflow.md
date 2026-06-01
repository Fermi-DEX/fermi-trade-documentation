---
title: Trader Workflow
description: The end-to-end flow for a bot or UI
---

# Trader Workflow

This page describes the end-to-end loop a UI or trading bot follows on
Fermi, from setup to steady-state trading.

## One-time setup

1. **Create a Fermi account** (or a sub-account) for the wallet. See
   [Accounts](09-accounts.md).
2. **Deposit collateral** to back trading. See
   [Collateral](10-collateral.md).
3. **(Optional) Set a delegate** so a hot wallet can sign orders while
   your withdrawal keys stay cold.
4. **(Optional) Expand the account** if you need more open-order or
   position slots — for example, a market maker quoting many levels.

## Placing an order

1. **Build the order** — side, size, type, caps, and modifiers. See
   [Order Types](17-order-types.md).
2. **Pre-check locally (optional).** You can estimate health and likely
   fill against the optimistic view before submitting, to avoid wasting
   a transaction on an order that would be rejected.
3. **Sign and submit** to the fast path. The order is sequenced by the
   [POSq sequencing layer](05-posq-sequencing-layer.md) and its place
   in line is locked on chain.
4. **Receive a pre-confirmation.** Within a fraction of a second you
   get your predicted fill from the optimistic view. See
   [Fast Pre-Confirmations](07-fast-pre-confirmations.md).
5. **Confirm.** The order executes on chain and reaches finality a beat
   later, matching the prediction.

## Steady-state loop

A typical bot runs a loop like:

- **Stream state and fills.** Subscribe to book updates, your account,
  and fill events over the event stream.
- **React on the optimistic view.** Make decisions against optimistic
  state for responsiveness.
- **Reconcile on the confirmed view.** Book realized PnL and balances
  against confirmed on-chain state, not optimistic state.
- **Manage health continuously.** Watch your health values; add
  collateral or reduce before maintenance health goes red. See
  [Margin & Account Health](20-margin-and-health.md).
- **Settle PnL periodically.** Settle profitable positions to USDC to
  free their PnL for cross-margin and remove any per-market cap. See
  [Entry Price & PnL](21-entry-price-and-pnl.md).

## Resilience

- Keep the [on-chain submission path](25-direct-onchain-submission.md)
  wired up as a fallback so you can always cancel or reduce, even if
  the fast path is unavailable.
- If the read layer degrades, read confirmed state directly from any
  Solana RPC — trading itself is unaffected.
- Use **reduce-only** for stops and always cap market orders.

## Tracing

If an order doesn't do what you expected, trace it by its market and
sequence number. Every stage — accepted, locked, revealed, executed, or
skipped — emits an event with a reason, so you can see exactly what
happened. See [API & SDK](27-api-and-sdk.md).
