---
title: Bankruptcy & Insurance Fund
description: What happens when losses exceed an account's collateral
---

# Bankruptcy & Insurance Fund

A **bankruptcy** is an account whose remaining liabilities exceed its
assets even after liquidation — a perp leg with losses larger than its
collateral, or a borrow with no collateral left behind it. Fermi has
three layers of defense, applied in order.

## The three layers

1. **Liquidator profit.** Ordinary liquidation transfers exposure at a
   discount to liquidators, who are incentivized to act early. This
   absorbs most drawdowns before they ever become bankruptcies. See
   [Liquidations](22-liquidations.md).
2. **Insurance fund.** A reserve vault, denominated in USDC and held by
   the protocol, covers the shortfall when liquidation isn't enough.
3. **Socialized loss.** As a last resort, any remaining shortfall is
   spread proportionally across depositors of the affected token.

## The insurance fund

The insurance fund is a passive USDC reserve. It is funded by a
configured share of liquidation fees and by governance top-ups. When an
account's losses exceed its collateral, the fund pays the shortfall (up
to its balance) so the counterparty is made whole. A market must be
flagged as insurance-fund-eligible to draw on it; if it isn't, its
shortfalls go straight to socialization.

## Socialized loss

If a shortfall remains after the insurance fund, it is socialized: each
depositor of the affected token absorbs a proportional share via a
one-time reduction in that token's deposit index. Concretely, if a
$1,000 shortfall must be spread across a pool with $100M of deposits,
every depositor's balance is haircut by about 0.001%. It is unwelcome
but bounded, and in practice the liquidator-profit and insurance layers
cover the overwhelming majority of any drawdown.

In the rare case where there are no depositors to socialize to (an
empty or winding-down bank), the shortfall is recorded as an accounting
loss against the market until governance recapitalizes — a theoretical
safeguard rather than something live markets normally encounter.

## What this means for you

The worst realistic case for a USDC depositor is a **tiny socialized
haircut** during an extreme, exchange-wide event — historically a small
fraction of a percent, distributed across everyone. The combined buffer
(liquidator profit, then insurance, then socialization) is designed so
that a typical trader never notices.

If you want to minimize even that exposure, hold collateral in a
**separate sub-account** with no perp risk and no borrows. A pure-USDC
sub-account is only ever exposed to the system-wide USDC socialization,
which is always orders of magnitude smaller than any single account's
PnL swing. See [Accounts](09-accounts.md).

## Observing bankruptcy events

Bankruptcy events, insurance-fund draws, and any index changes from
socialization are all emitted on the event stream, so they are publicly
auditable. See [API & SDK](27-api-and-sdk.md).
