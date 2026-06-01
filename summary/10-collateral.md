---
title: Collateral & Banks
description: Supported collateral, interest, and how deposits count toward your margin
---

# Collateral & Banks

Collateral on Fermi is held in **banks** — one bank per token. Each
bank holds the pooled deposits in an on-chain vault, sets the deposit
and borrow interest rates, and defines how much that token counts
toward your account health.

A deposit gives you three things: an interest-bearing balance,
cross-margin backing across every market in the group, and the ability
to borrow other tokens against it (subject to health).

## Supported collateral

USDC is the settlement token and the cleanest form of collateral. SOL,
ETH, BTC and other listed tokens are also accepted, each at its own
weight. The exact set of listed tokens and their parameters is shown
in the app and published with the [market specs](12-market-specs.md).

## Interest-bearing balances

Your balance is stored as an *index-relative* amount rather than a raw
token count. Both the deposit and borrow indexes start at a baseline
and grow over time as interest accrues. The practical effect: you
never claim interest — the same balance is simply worth more tokens
when you withdraw than when you deposited. A negative balance is a
borrow, on which you pay the borrow rate.

Rates follow a standard utilization curve: the more of a bank's
deposits are lent out, the higher the borrow rate, and the more
depositors earn. Rates update permissionlessly and on every deposit,
withdraw, or borrow.

## Collateral weights

Each bank applies a **weight** when your balance is counted toward
health:

- **Asset weight** discounts a deposit. High-quality collateral is
  weighted at or near full value; more volatile assets are weighted
  lower, so $1,000 of a volatile token supports less than $1,000 of
  borrowing power.
- **Liability weight** adds a premium to a borrow, so a borrow counts
  as slightly more than its face value against your health.

There are two flavors of each weight — **init** and **maintenance**.
The gap between them is your safety buffer: a position is only valid to
*open* when init health is non-negative, but it is only *liquidated*
when maintenance health goes negative. See
[Margin & Account Health](20-margin-and-health.md).

## Concentration limits

To prevent oversized concentrations, a bank can scale weights with the
*aggregate* amount deposited or borrowed against it. Beyond a
configured threshold, marginal deposits count for slightly less and
marginal borrows count for slightly more. This lets governance enforce
per-token caps smoothly, without rejecting deposits outright.

## The stable-price band

When you *open* new exposure, init health values your collateral using
the more conservative of the oracle price and a slow-moving **stable
price** (assets at the lower of the two, liabilities at the higher).
This means a momentary oracle spike can't temporarily inflate your
borrowing power — the stable price has to catch up first. See
[Pricing & Mark Price](13-pricing-and-mark-price.md).

## Withdrawal limits

A withdrawal must leave your init health non-negative, and it must
leave enough on-vault liquidity behind (a minimum vault-to-deposits
ratio) so that liquidators and other withdrawers are always served. If
a bank is heavily borrowed, a large withdrawal may be partially served
until borrowers repay.

## Wind-down and stale oracles

A bank can be put into **reduce-only** mode — deposits and repays only,
no new borrows — as the standard way to wind a listing down. And if a
bank's oracle goes stale, every health check that touches it fails by
design: a stale price is treated as unsafe to value, and trading
resumes once anyone refreshes the oracle.
