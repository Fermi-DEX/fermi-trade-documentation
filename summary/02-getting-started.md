---
title: Getting Started
description: Connect a wallet, fund an account, and place your first order
---

# Getting Started

This page takes you from an empty wallet to your first open position.

## 1. Connect a wallet

Fermi Trade is accessed with a Solana wallet. Connect an existing
wallet, or sign in with email to have one created for you. You always
hold the keys; Fermi never takes custody.

## 2. Create a Fermi account

Your trading state lives in a **Fermi account** — an on-chain address
derived from your wallet. It holds your collateral, your perp
positions, and your open orders. Creating one is a one-time setup
step in the app.

You can create several sub-accounts under the same wallet to isolate
risk between strategies. See [Accounts](09-accounts.md).

## 3. Fund your account

Deposit collateral to back your trades. Fermi is cross-margin: any
supported token you deposit can back positions in any market. USDC is
the settlement token; SOL, ETH, BTC and other listed tokens are also
accepted as collateral at their respective weights. See
[Collateral](10-collateral.md).

Deposits arrive on the Solana network and are credited to your Fermi
account as an interest-bearing balance.

## 4. Place your first order

Pick a market (for example SOL-PERP), choose a side and size, and
submit. The app builds an order, you sign it, and it is handed to the
POSq sequencing layer, which assigns it a place in line and locks
that position on chain.

Within a fraction of a second you'll see a **pre-confirmation** — your
predicted fill against the current book. On-chain finality follows a
beat later and matches the prediction, because the same deterministic
matching logic runs in both places. See
[Fast Pre-Confirmations](07-fast-pre-confirmations.md).

For the order types available (market, limit, post-only,
oracle-pegged, reduce-only, time-in-force), see
[Order Types](17-order-types.md).

## 5. Manage your position

Once you have exposure:

- **Unrealized PnL** is marked to the oracle price and updates live.
- **Funding** accrues continuously and is paid or received depending
  on your side. See [Funding](14-funding.md).
- **Account health** tells you how much room you have before
  liquidation. Keep it comfortably positive. See
  [Margin & Account Health](20-margin-and-health.md).

To close, place an opposing order — ideally `reduce-only`, so it can
never accidentally flip your position.

## Networks

Fermi Trade is deployed on Solana mainnet-beta. Development endpoints
(devnet program IDs, market and queue addresses, RPC and stream URLs)
are published separately for builders; see
[API & SDK](27-api-and-sdk.md).
