---
title: Entry Price & PnL
description: How Fermi tracks entry price, unrealized PnL, and realized PnL
---

# Entry Price & PnL

This page explains how your profit and loss is tracked: the difference
between unrealized and realized PnL, and what "settling" PnL means.

## Entry price

Each perp position tracks an effective **average entry price**. As you
add to a position, the average entry blends your new fills with the
existing exposure; as you reduce, the realized portion is booked and
the average entry of the remainder is preserved.

## Unrealized PnL

Unrealized PnL is the live, mark-to-oracle gain or loss on your open
exposure:

```
unrealized PnL ≈ quote balance + base position × oracle price
```

This is the "uPnL" figure in the app. It is always marked to the
**oracle** price — never the stable price — and it moves continuously
as the oracle moves. Funding is folded into the quote side of this as
it accrues. See [Funding](14-funding.md) and
[Pricing & Mark Price](13-pricing-and-mark-price.md).

## Realized PnL

When you close or reduce a position, the gain or loss on the closed
portion becomes **realized**. Realized PnL is bucketed so you can
distinguish trade PnL (from buying and selling) from other realized
effects.

## Settling PnL

Unrealized PnL lives on your perp position until it is **settled** into
your USDC balance. Settlement moves profit from the perp's counterpart
into your spendable collateral (and moves losses the other way). A few
things to know:

- **Settlement is permissionless** and pays a small bonus to whoever
  triggers it, so keepers keep the books settled for you. See
  [Fees](19-fees.md).
- Until you settle, a market's positive PnL may be **capped** in how
  much it can help your health on other markets — a per-market knob
  that prevents one market's paper gains from over-supporting your
  whole account. Settling to USDC removes that cap.
- Settlement is rate-limited per window, so very large PnL is settled
  in stages rather than all at once.

## Practical takeaways

- The number you watch on screen (uPnL) is mark-to-oracle and updates
  live.
- To turn paper gains into spendable, fully-cross-margin collateral,
  settle them to USDC.
- Don't book maker rebates or in-flight fills as realized until the
  corresponding on-chain events are confirmed — see
  [Fast Pre-Confirmations](07-fast-pre-confirmations.md).
