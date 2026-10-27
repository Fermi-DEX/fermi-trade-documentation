# share pricing and fees

NAV means net asset value. FLP calculates NAV from its supported trading assets and liabilities, including idle USDC.
Deposit and redemption escrows are excluded.

## Three NAV values

| Value | Purpose |
|---|---|
| `NAV_mid` | Oracle-marked equity and the graduation entry calculation |
| `NAV_high` | Ordinary queued and approved immediate deposit pricing |
| `NAV_low` | Withdrawal pricing and applicable fee calculations |

The high and low calculations compare oracle prices with stable prices.
For a long position, the low calculation uses the lower base price. For a short position, it uses the higher base price.
The high calculation uses the opposite choices.

The program includes executed fills that still await core event consumption in its effective valuation.
It replays those events on temporary copies. This valuation step does not consume the real queue.
An unfilled quote is not an executed trade.

## Unsettled PnL

Positive unsettled PnL is a profit claim that has not yet become settled USDC in the vault account.
It can include funding and realized-but-unsettled trading PnL.
A positive mark does not guarantee immediate collection from a counterparty.

The current positive-PnL haircut is 10,000 basis points, or 100%.
The low calculation excludes each positive unsettled perp contribution. Negative contributions still reduce value.
Ordinary entry includes positive PnL without that haircut.

**Counted at par when you enter, excluded when you exit.**

This asymmetry can make an immediate exit estimate lower than the amount deposited, even without an additional trading loss.
The exact difference also depends on stable prices, fees, and integer rounding.
If the administrator changes the haircut, the effect on withdrawal pricing changes too.

For example, assume 1,000 USDC of cash and 100 USDC of positive unsettled PnL, with equal oracle and stable marks.
Before fees and virtual balances, entry NAV is 1,100 USDC and withdrawal NAV is 1,000 USDC.
Settling the profit moves value into cash. It does not create a second profit.

## Share arithmetic

The pricing supply includes minted shares, allocated but unminted shares, and shares in unfunded withdrawals.
This prevents an unclaimed deposit or pending withdrawal from disappearing from the economic supply.

Ordinary pricing adds virtual balances of 1,000,000 share-native units and 1,000,000 quote-native units.
Both tokens use six decimals, so these are one share and one USDC.
The separate seed also creates non-redeemable dead shares.

```text
entry shares = floor(net deposit × (pricing supply + 1,000,000)
                     / (NAV_high + 1,000,000))

ordinary gross exit = floor(requested shares × (NAV_low + 1,000,000)
                           / (pricing supply + 1,000,000))
```

These equations use native units and positive NAV.
Nonpositive withdrawal NAV does not create a positive payout. Full recovery and terminal redemption use separate recovery ratios.

An epoch close uses one price snapshot after fee accrual and before that close's deposits and withdrawals.
A deferred batch is not guaranteed its original close price. See [withdrawal pricing](34-flp-withdrawals.md#when-the-payout-is-fixed).

## Fees

| Fee | Program treatment | Mainnet observation, 27 October 2026 |
|---|---|---|
| Deposit | Reduces the deposit amount used to calculate shares | 0 basis points |
| Withdrawal | Reduces the funded gross payout | 0 basis points |
| Management | Accrues fee shares over time | 0 basis points annually |
| Performance | Accrues fee shares above the high-water mark | 0 basis points |

Fee shares dilute other shares. The performance high-water mark is part of the on-chain fee calculation.
Zero vault fees do not remove trading fees, funding costs, slippage, liquidation costs, or Solana transaction fees.
The current values are configuration observations, not permanent fee commitments.

## Performance displays

An indicative NAV is not an executable entry or exit price.
A historical program observation is not current NAV.
A strategy reference series from before the vault launch is not the vault's own performance.

The daily API records sampled results. Sampling gaps and lifecycle transitions limit comparisons across days.
Past returns do not establish future returns.

Source: [Deployed FLP program](https://github.com/Fermi-DEX/fermi-v1-programs/tree/623f113075bd124948eabac8589bfbe8c53b11e8/flp/programs/flp-vault/src).
