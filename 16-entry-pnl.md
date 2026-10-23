# Entry price, PnL and settlement

A position can be profitable without having spendable quote tokens. Fermi separates trade economics, perp quote accounting and settlement into bank balances.

## Three useful views

| View | What it answers |
| --- | --- |
| Trade PnL against average entry | Did buying and selling the asset make money? |
| Unsettled perp value | What is the signed base plus quote position worth now, including applicable funding and pending-fill adjustments? |
| Settled token balance | How much value has actually moved into or out of the settlement bank? |

For a fully accounted position, the basic mark-to-market relationship is:

```text
perp value = quote_position_native + base_native × oracle_price
```

When reconstructing from raw fields, include unsettled funding and pending taker trades. Do not add them twice if using a health or SDK representation that already incorporates them.

## Average entry

Adding in the same direction changes the size-weighted average entry. Reducing a position realizes trade PnL on the closed portion while retaining the remaining entry basis. Flipping a position consists of closing the old side and opening the remainder at the fill price.

Example: a long of 3 bought at $100 sells 5 at $110. It realizes $30 on the closed long and opens a short of 2 at $110, before fees and funding. This does not by itself prove that $30 is withdrawable from the bank.

The account keeps separate trade and other-PnL accumulators and perp/spot transfer state. Those fields serve different reporting purposes; realized trade PnL and settled PnL are not synonyms.

## Settlement

`perp_settle_pnl` pairs positive and negative PnL accounts in a market. The amount is bounded by both sides, settlement limits, relevant health and oracle checks. It reduces the winner's perp quote claim and credits its settlement-token bank balance, while charging the counterparty and applying applicable fees.

A profitable account can wait for a suitable counterparty or for settlement capacity. The bank also needs liquidity before tokens can leave custody. FLP's funding rules explicitly distinguish these conditions.

## Closing all exposure

Cancel remaining orders, close the base, consume events, settle funding/PnL and check token liabilities. Deactivate a perp position only when the program's emptiness requirements are satisfied. A zero base position with nonzero quote is still an accounting position.


## Implementation reference

Reviewed at `90267b20`. [fermi_account_components.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [perp_settle_pnl.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [cache.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs). Source links require access to the implementation repository.
