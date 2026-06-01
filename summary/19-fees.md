---
title: Fees
description: Trading fees, penalties, settlement bonuses, and liquidation fees
---

# Fees

Every fee on Fermi is on-chain and programmatic. There are no hidden
off-chain fees. Fees go to one of two places: a per-market fee bucket
(eventually withdrawable by governance) or directly to a counterparty
(maker rebates, settlement bonuses, liquidator profit).

## Trading fees

- **Maker fee** — paid by the resting side. This can be **negative**,
  i.e. a rebate that pays you to provide liquidity.
- **Taker fee** — paid by the crossing side. Always a cost.
- **Fee penalty** — a flat fee charged on market and IOC orders at the
  moment of placement, whether or not the order fills. It prices in the
  work of running a match and discourages spammy taker traffic.

Maker and taker fees are charged as a fraction of the filled notional.
The protocol's net revenue on a fill is the taker fee minus whatever
rebate is paid to the maker.

## A worked example

Suppose taker fee is 4 bps, maker fee is a −2 bps rebate, and you send
an IOC bid that fills 1 unit at $150 (notional $150):

- You (taker) pay 4 bps of $150 = **$0.06**, plus the flat fee penalty.
- The maker receives 2 bps of $150 = **$0.03** (credited when the fill
  event is processed).
- The protocol keeps the **$0.03** difference.

Note the maker rebate is only final once the fill event is consumed —
don't treat it as realized PnL before then.

## Self-trades

A self-trade resolved by **decrement-take** is charged **zero fees** on
both legs. A self-trade resolved by **cancel-provide** produces no fill
at all, so no fee. See
[Self-Trade Prevention](18-self-trade-prevention.md).

## Settlement bonuses

Settling PnL is permissionless, and the market pays a small bonus to
whoever calls it (above a threshold settlement size), with the bonus
scaling up when the profitable counterparty is unhealthy. This pays
keepers to keep the books settled without any privileged role.

## Liquidation fees

When an account is liquidated:

- The liquidator earns a discount on the exposure they take over —
  this is their incentive.
- A separate platform cut goes to governance on top.
- Positive PnL claimed during a liquidation is settled to the
  liquidated account at a discount.

The fees differ for perp and spot-token liquidations but follow the
same pattern: the account being liquidated pays slightly worse than
the oracle price, and the difference is the liquidator's profit plus
the platform's cut. See [Liquidations](22-liquidations.md).

## A few non-obvious things

- The fee penalty is charged on **placement**, not on fills — a no-fill
  IOC still costs the penalty.
- Maker rebates are "in flight" until the fill event is consumed; don't
  model them in real-time PnL.
- Fee withdrawals respect solvency: accrued fees can't be withdrawn in
  a way that would push the books into uncovered loss — the same
  invariant that protects depositors.
